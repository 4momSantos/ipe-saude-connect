-- ✅ FASE 3: Corrigir função de criação de credenciado para detectar PF/PJ

CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado()
RETURNS TRIGGER AS $$
DECLARE
  v_dados jsonb;
  v_credenciado_id uuid;
  v_nome text;
  v_email text;
  v_telefone text;
  v_celular text;
  v_endereco_completo text;
  v_crm text;
  v_uf_crm text;
  v_especialidade_id uuid;
  v_especialidade_nome text;
  v_horario_record jsonb;
  v_credenciado_crm_id uuid;
  v_dia_normalizado text;
  v_data_solicitacao timestamptz;
  v_tipo_credenciamento text; -- ✅ NOVA VARIÁVEL
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    v_dados := NEW.dados_inscricao;
    
    SELECT id INTO v_credenciado_id
    FROM public.credenciados
    WHERE inscricao_id = NEW.id;
    
    IF v_credenciado_id IS NOT NULL THEN
      RAISE NOTICE '[SYNC_CREDENCIADO] Credenciado já existe para inscrição %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- ✅ DETECTAR TIPO DE CREDENCIAMENTO (PF ou PJ)
    IF v_dados->'pessoa_juridica'->>'cnpj' IS NOT NULL AND v_dados->'pessoa_juridica'->>'cnpj' != '' THEN
      v_tipo_credenciamento := 'PJ';
      RAISE NOTICE '[SYNC_CREDENCIADO] Tipo: Pessoa Jurídica (CNPJ detectado)';
    ELSIF v_dados->'dados_pessoais'->>'cpf' IS NOT NULL AND v_dados->'dados_pessoais'->>'cpf' != '' THEN
      v_tipo_credenciamento := 'PF';
      RAISE NOTICE '[SYNC_CREDENCIADO] Tipo: Pessoa Física (CPF detectado)';
    ELSE
      -- Fallback: assumir PF se não detectar
      v_tipo_credenciamento := 'PF';
      RAISE WARNING '[SYNC_CREDENCIADO] Tipo não detectado, usando PF como padrão';
    END IF;
    
    -- CAPTURAR DATA DE SOLICITAÇÃO DA INSCRIÇÃO
    v_data_solicitacao := NEW.created_at;
    
    v_nome := COALESCE(
      v_dados->'pessoa_juridica'->>'denominacao_social',
      v_dados->'dados_pessoais'->>'nome_completo'
    );
    
    v_email := COALESCE(
      v_dados->'endereco_correspondencia'->>'email',
      v_dados->'pessoa_juridica'->'contatos'->>'email',
      v_dados->'dados_pessoais'->>'email'
    );
    
    v_telefone := COALESCE(
      v_dados->'endereco_correspondencia'->>'telefone',
      v_dados->'pessoa_juridica'->'contatos'->>'telefone'
    );
    
    v_celular := COALESCE(
      v_dados->'endereco_correspondencia'->>'celular',
      v_dados->'pessoa_juridica'->'contatos'->>'celular'
    );
    
    v_endereco_completo := COALESCE(
      (v_dados->'pessoa_juridica'->'endereco'->>'logradouro' || ', ' || 
       COALESCE(v_dados->'pessoa_juridica'->'endereco'->>'numero', 'S/N')),
      v_dados->'endereco_correspondencia'->>'endereco'
    );
    
    IF v_nome IS NULL OR v_nome = '' THEN
      RAISE EXCEPTION '[SYNC_CREDENCIADO] Nome é obrigatório. Inscrição: %', NEW.id;
    END IF;
    
    -- ✅ CRIAR CREDENCIADO COM TIPO_CREDENCIAMENTO
    INSERT INTO public.credenciados (
      inscricao_id, 
      nome, 
      cpf, 
      cnpj, 
      rg, 
      data_nascimento,
      email, 
      telefone, 
      celular, 
      endereco, 
      cidade, 
      estado, 
      cep,
      status, 
      observacoes,
      data_solicitacao, 
      data_habilitacao, 
      data_inicio_atendimento,
      tipo_credenciamento -- ✅ ADICIONAR CAMPO
    )
    VALUES (
      NEW.id, 
      v_nome,
      v_dados->'dados_pessoais'->>'cpf',
      v_dados->'pessoa_juridica'->>'cnpj',
      v_dados->'dados_pessoais'->>'rg',
      (v_dados->'dados_pessoais'->>'data_nascimento')::date,
      v_email, 
      v_telefone, 
      v_celular, 
      v_endereco_completo,
      COALESCE(v_dados->'pessoa_juridica'->'endereco'->>'cidade', v_dados->'endereco'->>'cidade'),
      COALESCE(v_dados->'pessoa_juridica'->'endereco'->>'estado', v_dados->'endereco'->>'estado'),
      COALESCE(v_dados->'pessoa_juridica'->'endereco'->>'cep', v_dados->'endereco'->>'cep'),
      'Ativo',
      'Credenciado automaticamente via workflow de inscrição',
      v_data_solicitacao, 
      NOW(), 
      CURRENT_DATE,
      v_tipo_credenciamento -- ✅ PREENCHER TIPO
    )
    RETURNING id INTO v_credenciado_id;
    
    RAISE NOTICE '[SYNC_CREDENCIADO] ✅ Credenciado criado: % (Tipo: %)', v_credenciado_id, v_tipo_credenciamento;
    
    -- Processar CRMs e horários
    v_crm := v_dados->'dados_pessoais'->>'crm';
    v_uf_crm := v_dados->'dados_pessoais'->>'uf_crm';
    
    IF v_crm IS NOT NULL AND v_dados->'consultorio'->'especialidades_ids' IS NOT NULL THEN
      SELECT jsonb_array_elements_text(v_dados->'consultorio'->'especialidades_ids')::uuid
      INTO v_especialidade_id LIMIT 1;
      
      IF v_especialidade_id IS NOT NULL THEN
        SELECT nome INTO v_especialidade_nome
        FROM public.especialidades_medicas
        WHERE id = v_especialidade_id;
        
        INSERT INTO public.credenciado_crms (
          credenciado_id, crm, uf_crm, especialidade, especialidade_id
        )
        VALUES (v_credenciado_id, v_crm, v_uf_crm, v_especialidade_nome, v_especialidade_id)
        ON CONFLICT (credenciado_id, crm, uf_crm) DO NOTHING
        RETURNING id INTO v_credenciado_crm_id;
        
        IF v_credenciado_crm_id IS NOT NULL AND v_dados->'consultorio'->'horarios' IS NOT NULL THEN
          FOR v_horario_record IN 
            SELECT * FROM jsonb_array_elements(v_dados->'consultorio'->'horarios')
          LOOP
            v_dia_normalizado := CASE LOWER(v_horario_record->>'dia_semana')
              WHEN 'segunda' THEN 'Segunda' WHEN 'terça' THEN 'Terça' WHEN 'terca' THEN 'Terça'
              WHEN 'quarta' THEN 'Quarta' WHEN 'quinta' THEN 'Quinta' WHEN 'sexta' THEN 'Sexta'
              WHEN 'sábado' THEN 'Sábado' WHEN 'sabado' THEN 'Sábado' WHEN 'domingo' THEN 'Domingo'
              ELSE v_horario_record->>'dia_semana'
            END;
            
            INSERT INTO public.horarios_atendimento (
              credenciado_crm_id, dia_semana, horario_inicio, horario_fim
            )
            VALUES (
              v_credenciado_crm_id, v_dia_normalizado,
              (v_horario_record->>'horario_inicio')::time,
              (v_horario_record->>'horario_fim')::time
            );
          END LOOP;
        END IF;
      END IF;
    END IF;
    
    INSERT INTO public.credenciado_historico (credenciado_id, tipo, descricao, usuario_responsavel)
    VALUES (
      v_credenciado_id, 'credenciamento',
      'Credenciamento realizado após aprovação da inscrição no edital',
      (SELECT email FROM auth.users WHERE id = NEW.analisado_por)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';