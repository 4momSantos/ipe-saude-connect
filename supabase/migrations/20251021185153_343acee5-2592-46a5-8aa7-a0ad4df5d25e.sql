-- Corrigir função sync_approved_inscricao_to_credenciado_v2
-- Trocar tipo_manifestacao → tipo e metadata → manifestacao_metadata

DROP FUNCTION IF EXISTS public.sync_approved_inscricao_to_credenciado_v2(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado_v2(p_inscricao_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_credenciado_id UUID;
  v_contrato_dados JSONB;
  v_inscricao_dados JSONB;
  v_especialidade_id UUID;
  v_crm TEXT;
  v_uf_crm TEXT;
  v_especialidade_nome TEXT;
  v_consultorio JSONB;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔄 SYNC INICIADO para inscrição: %', p_inscricao_id;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  -- 1. Buscar credenciado
  SELECT id INTO v_credenciado_id
  FROM credenciados
  WHERE inscricao_id = p_inscricao_id;

  IF v_credenciado_id IS NULL THEN
    RAISE NOTICE '❌ Credenciado não encontrado para inscrição %', p_inscricao_id;
    
    INSERT INTO public.workflow_messages (
      inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
    ) VALUES (
      p_inscricao_id, 'system', 
      'Erro: Credenciado não encontrado para esta inscrição',
      'erro', ARRAY['analista', 'gestor']::text[], 
      jsonb_build_object('erro', 'credenciado_nao_encontrado')
    );
    
    RETURN NULL;
  END IF;

  RAISE NOTICE '✅ Credenciado encontrado: %', v_credenciado_id;

  -- 2. Buscar dados do contrato aprovado
  SELECT 
    c.dados_contrato,
    ie.dados_inscricao
  INTO v_contrato_dados, v_inscricao_dados
  FROM contratos c
  JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
  WHERE c.inscricao_id = p_inscricao_id
    AND c.status IN ('ativo', 'assinado')
  ORDER BY c.created_at DESC
  LIMIT 1;

  IF v_contrato_dados IS NULL THEN
    RAISE NOTICE '❌ Contrato não encontrado ou não aprovado';
    
    INSERT INTO public.workflow_messages (
      inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
    ) VALUES (
      p_inscricao_id, 'system',
      'Erro: Contrato não encontrado ou não está ativo/assinado',
      'erro', ARRAY['analista', 'gestor']::text[],
      jsonb_build_object('erro', 'contrato_nao_encontrado')
    );
    
    RETURN NULL;
  END IF;

  IF v_inscricao_dados IS NULL THEN
    RAISE NOTICE '❌ dados_inscricao está NULL na inscrição';
    
    INSERT INTO public.workflow_messages (
      inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
    ) VALUES (
      p_inscricao_id, 'system',
      'Erro: Dados da inscrição não disponíveis (dados_inscricao NULL)',
      'erro', ARRAY['analista', 'gestor']::text[],
      jsonb_build_object('erro', 'dados_inscricao_null')
    );
    
    RETURN NULL;
  END IF;

  RAISE NOTICE '✅ Contrato encontrado';
  RAISE NOTICE '📋 Dados disponíveis: nome=%, cpf=%, email=%',
    v_contrato_dados->>'candidato_nome',
    v_contrato_dados->>'candidato_cpf',
    v_contrato_dados->>'candidato_email';

  -- 3. UPDATE credenciado (APENAS campos existentes)
  UPDATE credenciados
  SET
    nome = COALESCE(v_contrato_dados->>'candidato_nome', nome),
    cpf = COALESCE(v_contrato_dados->>'candidato_cpf', cpf),
    rg = COALESCE(v_contrato_dados->>'candidato_rg', rg),
    email = COALESCE(v_contrato_dados->>'candidato_email', email),
    telefone = COALESCE(v_contrato_dados->>'candidato_telefone', telefone),
    celular = COALESCE(v_contrato_dados->>'candidato_celular', celular),
    data_nascimento = COALESCE(
      (v_contrato_dados->>'candidato_data_nascimento')::date, 
      data_nascimento
    ),
    endereco = COALESCE(
      v_inscricao_dados->'endereco_correspondencia'->>'logradouro',
      endereco
    ),
    cidade = COALESCE(
      v_inscricao_dados->'endereco_correspondencia'->>'cidade',
      cidade
    ),
    estado = COALESCE(
      v_inscricao_dados->'endereco_correspondencia'->>'uf',
      estado
    ),
    cep = COALESCE(
      v_inscricao_dados->'endereco_correspondencia'->>'cep',
      cep
    ),
    status = 'Ativo',
    updated_at = NOW()
  WHERE id = v_credenciado_id;

  RAISE NOTICE '✅ Credenciado atualizado com dados do contrato';

  -- Validar se temos dados_pessoais ou dadosPJ
  IF v_inscricao_dados->'dados_pessoais' IS NULL AND v_inscricao_dados->'dadosPJ' IS NULL THEN
    RAISE NOTICE '⚠️ AVISO: Nem dados_pessoais nem dadosPJ estão presentes';
    
    INSERT INTO public.workflow_messages (
      inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
    ) VALUES (
      p_inscricao_id, 'system',
      'Aviso: dados_pessoais e dadosPJ ausentes. Pulando processamento de CRM.',
      'alerta', ARRAY['analista', 'gestor']::text[],
      jsonb_build_object('aviso', 'dados_pessoais_ausentes')
    );
  END IF;

  -- 4. Processar CRM principal (dados_pessoais)
  IF v_inscricao_dados->'dados_pessoais' IS NOT NULL THEN
    v_crm := v_inscricao_dados->'dados_pessoais'->>'crm';
    v_uf_crm := v_inscricao_dados->'dados_pessoais'->>'uf_crm';
    
    IF v_crm IS NOT NULL AND v_uf_crm IS NOT NULL THEN
      -- Buscar especialidade se houver ID
      IF v_inscricao_dados->'dados_pessoais'->>'especialidade_id' IS NOT NULL THEN
        v_especialidade_id := (v_inscricao_dados->'dados_pessoais'->>'especialidade_id')::UUID;
        
        SELECT nome INTO v_especialidade_nome
        FROM especialidades_medicas
        WHERE id = v_especialidade_id;
      END IF;

      -- Inserir ou atualizar CRM
      INSERT INTO credenciado_crms (
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
        COALESCE(v_especialidade_nome, v_inscricao_dados->'dados_pessoais'->>'especialidade', 'Não informada'),
        v_especialidade_id
      )
      ON CONFLICT (credenciado_id, crm, uf_crm) 
      DO UPDATE SET
        especialidade = EXCLUDED.especialidade,
        especialidade_id = EXCLUDED.especialidade_id;

      RAISE NOTICE '✅ CRM principal inserido: %/%', v_crm, v_uf_crm;
    END IF;
  END IF;

  -- Validar se nome e cpf estão preenchidos
  DECLARE
    v_nome_final TEXT;
    v_cpf_final TEXT;
  BEGIN
    SELECT nome, cpf INTO v_nome_final, v_cpf_final
    FROM credenciados
    WHERE id = v_credenciado_id;
    
    IF v_nome_final IS NULL OR v_cpf_final IS NULL THEN
      RAISE NOTICE '⚠️ AVISO CRÍTICO: Credenciado sem nome ou CPF!';
      RAISE NOTICE '   Nome: %', v_nome_final;
      RAISE NOTICE '   CPF: %', v_cpf_final;
      
      INSERT INTO public.workflow_messages (
        inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
      ) VALUES (
        p_inscricao_id, 'system',
        'Aviso: Credenciado criado mas está sem nome ou CPF. Revisar dados do contrato.',
        'alerta', ARRAY['analista', 'gestor']::text[],
        jsonb_build_object(
          'credenciado_id', v_credenciado_id,
          'nome_preenchido', v_nome_final IS NOT NULL,
          'cpf_preenchido', v_cpf_final IS NOT NULL
        )
      );
    END IF;
  END;

  -- 5. Processar CRMs de consultórios (se houver array de consultorios)
  IF v_inscricao_dados->'consultorios' IS NOT NULL THEN
    FOR v_consultorio IN 
      SELECT jsonb_array_elements(v_inscricao_dados->'consultorios')
    LOOP
      v_crm := v_consultorio->>'crm';
      v_uf_crm := v_consultorio->>'uf_crm';
      
      IF v_crm IS NOT NULL AND v_uf_crm IS NOT NULL THEN
        INSERT INTO credenciado_crms (
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
          COALESCE(v_consultorio->>'especialidade', 'Não informada'),
          (v_consultorio->>'especialidade_id')::UUID
        )
        ON CONFLICT (credenciado_id, crm, uf_crm) DO NOTHING;

        RAISE NOTICE '✅ CRM de consultório inserido: %/%', v_crm, v_uf_crm;
      END IF;
    END LOOP;
  END IF;

  -- 6. Copiar consultórios de inscricao_consultorios
  INSERT INTO credenciado_consultorios (
    credenciado_id,
    inscricao_consultorio_id,
    nome_consultorio,
    cnes,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    telefone,
    ramal,
    responsavel_tecnico_nome,
    responsavel_tecnico_crm,
    responsavel_tecnico_uf,
    horarios,
    especialidades_ids,
    is_principal,
    ativo
  )
  SELECT
    v_credenciado_id,
    ic.id,
    ic.nome_consultorio,
    ic.cnes,
    ic.cep,
    ic.logradouro,
    ic.numero,
    ic.complemento,
    ic.bairro,
    ic.cidade,
    ic.estado,
    ic.telefone,
    ic.ramal,
    ic.responsavel_tecnico_nome,
    ic.responsavel_tecnico_crm,
    ic.responsavel_tecnico_uf,
    ic.horarios,
    ic.especialidades_ids,
    ic.is_principal,
    true
  FROM inscricao_consultorios ic
  WHERE ic.inscricao_id = p_inscricao_id
    AND ic.ativo = true
  ON CONFLICT (credenciado_id, inscricao_consultorio_id) 
  DO UPDATE SET
    nome_consultorio = EXCLUDED.nome_consultorio,
    cnes = EXCLUDED.cnes,
    horarios = EXCLUDED.horarios,
    updated_at = NOW();

  RAISE NOTICE '✅ Consultórios copiados de inscricao_consultorios';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ SYNC CONCLUÍDO com sucesso';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  RETURN v_credenciado_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO no sync: %', SQLERRM;
    
    INSERT INTO public.workflow_messages (
      inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
    ) VALUES (
      p_inscricao_id, 'system',
      format('Erro ao sincronizar credenciado: %s', SQLERRM),
      'erro', ARRAY['analista', 'gestor']::text[],
      jsonb_build_object('erro_sql', SQLERRM, 'credenciado_id', v_credenciado_id)
    );
    
    RAISE;
END;
$function$;