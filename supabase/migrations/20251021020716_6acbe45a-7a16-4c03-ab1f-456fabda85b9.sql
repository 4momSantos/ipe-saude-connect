-- ═══════════════════════════════════════════════════════════
-- CORREÇÃO DEFINITIVA CRED-001014 + FUNÇÃO SYNC
-- ═══════════════════════════════════════════════════════════

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ETAPA 1: UPDATE MANUAL DO CRED-001014
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
  v_credenciado_id UUID;
  v_contrato_dados JSONB;
  v_inscricao_dados JSONB;
BEGIN
  -- Buscar ID do credenciado
  SELECT id INTO v_credenciado_id
  FROM credenciados
  WHERE numero_credenciado = 'CRED-001014';

  IF v_credenciado_id IS NULL THEN
    RAISE EXCEPTION 'CRED-001014 não encontrado';
  END IF;

  -- Buscar dados do contrato e inscrição
  SELECT 
    c.dados_contrato,
    ie.dados_inscricao
  INTO v_contrato_dados, v_inscricao_dados
  FROM contratos c
  JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
  WHERE c.numero_contrato = 'CONT-2025-270384';

  IF v_contrato_dados IS NULL THEN
    RAISE EXCEPTION 'Contrato CONT-2025-270384 não encontrado';
  END IF;

  -- UPDATE credenciado com dados do contrato
  UPDATE credenciados
  SET
    nome = COALESCE(v_contrato_dados->>'candidato_nome', 'Não informado'),
    cpf = v_contrato_dados->>'candidato_cpf',
    rg = v_contrato_dados->>'candidato_rg',
    email = v_contrato_dados->>'candidato_email',
    telefone = v_contrato_dados->>'candidato_telefone',
    celular = v_contrato_dados->>'candidato_celular',
    data_nascimento = (v_contrato_dados->>'candidato_data_nascimento')::date,
    endereco = v_inscricao_dados->'endereco_correspondencia'->>'logradouro',
    cidade = v_inscricao_dados->'endereco_correspondencia'->>'cidade',
    estado = v_inscricao_dados->'endereco_correspondencia'->>'uf',
    cep = v_inscricao_dados->'endereco_correspondencia'->>'cep',
    status = 'Ativo',
    updated_at = NOW()
  WHERE id = v_credenciado_id;

  RAISE NOTICE '✅ CRED-001014 atualizado: nome=%, cpf=%, email=%',
    v_contrato_dados->>'candidato_nome',
    v_contrato_dados->>'candidato_cpf',
    v_contrato_dados->>'candidato_email';

  -- INSERT CRM na tabela credenciado_crms
  INSERT INTO credenciado_crms (
    credenciado_id,
    crm,
    uf_crm,
    especialidade,
    especialidade_id
  )
  VALUES (
    v_credenciado_id,
    '0101010',
    'RS',
    'Psiquiatria',
    'b435f487-63d2-4f77-85c2-f5886523bedc'
  )
  ON CONFLICT (credenciado_id, crm, uf_crm) 
  DO UPDATE SET
    especialidade = EXCLUDED.especialidade,
    especialidade_id = EXCLUDED.especialidade_id;

  RAISE NOTICE '✅ CRM inserido: 0101010/RS - Psiquiatria';

END $$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ETAPA 2: REESCREVER FUNÇÃO sync_approved_inscricao_to_credenciado_v2
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DROP FUNCTION IF EXISTS sync_approved_inscricao_to_credenciado_v2(UUID);

CREATE OR REPLACE FUNCTION sync_approved_inscricao_to_credenciado_v2(
  p_inscricao_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

  -- 4. Processar CRM principal (dados_pessoais)
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
    RAISE;
END;
$$;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- ETAPA 3: VALIDAÇÃO FINAL
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DO $$
DECLARE
  v_credenciado RECORD;
  v_crm_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '🔍 VALIDAÇÃO FINAL - CRED-001014';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';

  -- Buscar dados do credenciado
  SELECT 
    numero_credenciado,
    nome,
    cpf,
    email,
    telefone,
    endereco,
    cidade,
    status
  INTO v_credenciado
  FROM credenciados
  WHERE numero_credenciado = 'CRED-001014';

  RAISE NOTICE '';
  RAISE NOTICE '📋 Dados do Credenciado:';
  RAISE NOTICE '  • Número: %', v_credenciado.numero_credenciado;
  RAISE NOTICE '  • Nome: %', v_credenciado.nome;
  RAISE NOTICE '  • CPF: %', v_credenciado.cpf;
  RAISE NOTICE '  • Email: %', v_credenciado.email;
  RAISE NOTICE '  • Telefone: %', v_credenciado.telefone;
  RAISE NOTICE '  • Endereço: %', v_credenciado.endereco;
  RAISE NOTICE '  • Cidade: %', v_credenciado.cidade;
  RAISE NOTICE '  • Status: %', v_credenciado.status;

  -- Verificar CRMs
  SELECT COUNT(*) INTO v_crm_count
  FROM credenciado_crms cc
  JOIN credenciados c ON c.id = cc.credenciado_id
  WHERE c.numero_credenciado = 'CRED-001014';

  RAISE NOTICE '';
  RAISE NOTICE '🏥 CRMs Cadastrados: %', v_crm_count;

  IF v_crm_count > 0 THEN
    FOR v_credenciado IN (
      SELECT cc.crm, cc.uf_crm, cc.especialidade
      FROM credenciado_crms cc
      JOIN credenciados c ON c.id = cc.credenciado_id
      WHERE c.numero_credenciado = 'CRED-001014'
    )
    LOOP
      RAISE NOTICE '  • CRM: % / UF: % / Especialidade: %',
        v_credenciado.crm,
        v_credenciado.uf_crm,
        v_credenciado.especialidade;
    END LOOP;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ CORREÇÃO DEFINITIVA CONCLUÍDA';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';

END $$;