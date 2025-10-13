-- Corrigir normalização de dia_semana no trigger
CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
BEGIN
  -- Só processa se status mudou para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    
    v_dados := NEW.dados_inscricao;
    
    -- Verificar se já existe credenciado para esta inscrição
    SELECT id INTO v_credenciado_id
    FROM public.credenciados
    WHERE inscricao_id = NEW.id;
    
    -- Se já existe, não faz nada
    IF v_credenciado_id IS NOT NULL THEN
      RAISE NOTICE '[SYNC_CREDENCIADO] Credenciado já existe para inscrição %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- EXTRAIR DADOS COM MAPEAMENTO CORRETO
    -- Nome: pessoa jurídica > pessoa física
    v_nome := COALESCE(
      v_dados->'pessoa_juridica'->>'denominacao_social',
      v_dados->'dados_pessoais'->>'nome_completo'
    );
    
    -- Email: correspondência > contatos PJ > dados pessoais
    v_email := COALESCE(
      v_dados->'endereco_correspondencia'->>'email',
      v_dados->'pessoa_juridica'->'contatos'->>'email',
      v_dados->'dados_pessoais'->>'email'
    );
    
    -- Telefones: correspondência > dados pessoais
    v_telefone := COALESCE(
      v_dados->'endereco_correspondencia'->>'telefone',
      v_dados->'pessoa_juridica'->'contatos'->>'telefone'
    );
    
    v_celular := COALESCE(
      v_dados->'endereco_correspondencia'->>'celular',
      v_dados->'pessoa_juridica'->'contatos'->>'celular'
    );
    
    -- Endereço completo: PJ > correspondência
    v_endereco_completo := COALESCE(
      (v_dados->'pessoa_juridica'->'endereco'->>'logradouro' || ', ' || 
       COALESCE(v_dados->'pessoa_juridica'->'endereco'->>'numero', 'S/N')),
      v_dados->'endereco_correspondencia'->>'endereco'
    );
    
    -- Log dos dados extraídos
    RAISE NOTICE '[SYNC_CREDENCIADO] Dados extraídos: nome=%, cpf=%, cnpj=%, email=%', 
      v_nome, 
      v_dados->'dados_pessoais'->>'cpf',
      v_dados->'pessoa_juridica'->>'cnpj',
      v_email;
    
    -- VALIDAÇÃO OBRIGATÓRIA
    IF v_nome IS NULL OR v_nome = '' THEN
      RAISE EXCEPTION '[SYNC_CREDENCIADO] Nome é obrigatório. Inscrição: %. Dados: %', 
        NEW.id, 
        v_dados;
    END IF;
    
    -- CRIAR CREDENCIADO
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
      observacoes
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
      'Credenciado automaticamente via workflow de inscrição'
    )
    RETURNING id INTO v_credenciado_id;
    
    RAISE NOTICE '[SYNC_CREDENCIADO] Credenciado % criado com sucesso', v_credenciado_id;
    
    -- PROCESSAR CRMs E ESPECIALIDADES
    -- Extrai CRM único dos dados pessoais
    v_crm := v_dados->'dados_pessoais'->>'crm';
    v_uf_crm := v_dados->'dados_pessoais'->>'uf_crm';
    
    IF v_crm IS NOT NULL THEN
      -- Processar especialidades do consultório
      IF v_dados->'consultorio'->'especialidades_ids' IS NOT NULL THEN
        FOR v_especialidade_id IN 
          SELECT jsonb_array_elements_text(v_dados->'consultorio'->'especialidades_ids')::uuid
        LOOP
          -- Buscar nome da especialidade
          SELECT nome INTO v_especialidade_nome
          FROM public.especialidades_medicas
          WHERE id = v_especialidade_id;
          
          INSERT INTO public.credenciado_crms (
            credenciado_id,
            crm,
            uf_crm,
            especialidade,
            especialidade_id
          )
          VALUES (
            v_credenciado_id,
            v_crm,
            v_uf_crm,
            v_especialidade_nome,
            v_especialidade_id
          )
          RETURNING id INTO v_credenciado_crm_id;
          
          RAISE NOTICE '[SYNC_CREDENCIADO] CRM % registrado para especialidade %', v_crm, v_especialidade_nome;
          
          -- Processar horários de atendimento
          IF v_dados->'consultorio'->'horarios' IS NOT NULL THEN
            FOR v_horario_record IN 
              SELECT * FROM jsonb_array_elements(v_dados->'consultorio'->'horarios')
            LOOP
              -- Normalizar dia_semana para o formato esperado
              v_dia_normalizado := CASE LOWER(v_horario_record->>'dia_semana')
                WHEN 'segunda' THEN 'Segunda'
                WHEN 'terça' THEN 'Terça'
                WHEN 'terca' THEN 'Terça'
                WHEN 'quarta' THEN 'Quarta'
                WHEN 'quinta' THEN 'Quinta'
                WHEN 'sexta' THEN 'Sexta'
                WHEN 'sábado' THEN 'Sábado'
                WHEN 'sabado' THEN 'Sábado'
                WHEN 'domingo' THEN 'Domingo'
                ELSE v_horario_record->>'dia_semana'
              END;
              
              INSERT INTO public.horarios_atendimento (
                credenciado_crm_id,
                dia_semana,
                horario_inicio,
                horario_fim
              )
              VALUES (
                v_credenciado_crm_id,
                v_dia_normalizado,
                (v_horario_record->>'horario_inicio')::time,
                (v_horario_record->>'horario_fim')::time
              );
              
              RAISE NOTICE '[SYNC_CREDENCIADO] Horário adicionado: % de % às %', 
                v_dia_normalizado,
                v_horario_record->>'horario_inicio',
                v_horario_record->>'horario_fim';
            END LOOP;
          END IF;
        END LOOP;
      END IF;
    END IF;
    
    -- Criar registro no histórico
    INSERT INTO public.credenciado_historico (
      credenciado_id,
      tipo,
      descricao,
      usuario_responsavel
    )
    VALUES (
      v_credenciado_id,
      'credenciamento',
      'Credenciamento realizado após aprovação da inscrição no edital',
      (SELECT email FROM auth.users WHERE id = NEW.analisado_por)
    );
    
    RAISE NOTICE '[SYNC_CREDENCIADO] Processo completo para credenciado %', v_credenciado_id;
  END IF;
  
  RETURN NEW;
END;
$function$;