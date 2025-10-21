-- ═══════════════════════════════════════════════════════════
-- CRIAR FUNÇÃO RPC: sync_credenciado_from_contract
-- Esta função extrai dados CORRETOS de contratos.dados_contrato
-- e faz UPSERT em credenciados
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_credenciado_from_contract(
  p_inscricao_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_credenciado_id UUID;
  v_dados_contrato JSONB;
  v_dados_inscricao JSONB;
  v_crm TEXT;
  v_uf_crm TEXT;
  v_especialidade_id UUID;
  v_consultorio JSONB;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔄 SYNC_FROM_CONTRACT iniciado para inscrição: %', p_inscricao_id;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  -- Buscar dados do contrato ASSINADO
  SELECT 
    c.dados_contrato,
    ie.dados_inscricao
  INTO v_dados_contrato, v_dados_inscricao
  FROM contratos c
  JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
  WHERE c.inscricao_id = p_inscricao_id
    AND c.status IN ('ativo', 'assinado')
  ORDER BY c.assinado_em DESC NULLS LAST, c.created_at DESC
  LIMIT 1;

  IF v_dados_contrato IS NULL THEN
    RAISE WARNING '❌ Contrato assinado não encontrado para %', p_inscricao_id;
    RETURN NULL;
  END IF;

  RAISE NOTICE '✅ Contrato encontrado';
  RAISE NOTICE '📋 Dados: nome=%, cpf=%, email=%',
    v_dados_contrato->>'candidato_nome',
    v_dados_contrato->>'candidato_cpf',
    v_dados_contrato->>'candidato_email';

  -- UPSERT credenciado com dados do CONTRATO
  INSERT INTO credenciados (
    inscricao_id,
    nome,
    cpf,
    rg,
    email,
    telefone,
    celular,
    data_nascimento,
    endereco,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    cep,
    status,
    data_credenciamento,
    created_at,
    updated_at
  )
  VALUES (
    p_inscricao_id,
    COALESCE(v_dados_contrato->>'candidato_nome', 'Não informado'),
    v_dados_contrato->>'candidato_cpf',
    v_dados_contrato->>'candidato_rg',
    v_dados_contrato->>'candidato_email',
    v_dados_contrato->>'candidato_telefone',
    v_dados_contrato->>'candidato_celular',
    (v_dados_contrato->>'candidato_data_nascimento')::date,
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'logradouro',
      v_dados_inscricao->'endereco'->>'logradouro'
    ),
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'numero',
      v_dados_inscricao->'endereco'->>'numero'
    ),
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'complemento',
      v_dados_inscricao->'endereco'->>'complemento'
    ),
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'bairro',
      v_dados_inscricao->'endereco'->>'bairro'
    ),
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'cidade',
      v_dados_inscricao->'endereco'->>'cidade'
    ),
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'uf',
      v_dados_inscricao->'endereco'->>'estado'
    ),
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'cep',
      v_dados_inscricao->'endereco'->>'cep'
    ),
    'Ativo',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (inscricao_id) DO UPDATE SET
    nome = EXCLUDED.nome,
    cpf = EXCLUDED.cpf,
    rg = EXCLUDED.rg,
    email = EXCLUDED.email,
    telefone = EXCLUDED.telefone,
    celular = EXCLUDED.celular,
    data_nascimento = EXCLUDED.data_nascimento,
    endereco = EXCLUDED.endereco,
    numero = EXCLUDED.numero,
    complemento = EXCLUDED.complemento,
    bairro = EXCLUDED.bairro,
    cidade = EXCLUDED.cidade,
    estado = EXCLUDED.estado,
    cep = EXCLUDED.cep,
    status = 'Ativo',
    updated_at = NOW()
  RETURNING id INTO v_credenciado_id;

  RAISE NOTICE '✅ Credenciado % sincronizado com dados do contrato', v_credenciado_id;

  -- Inserir CRM principal se existir
  v_crm := v_dados_inscricao->'dados_pessoais'->>'crm';
  v_uf_crm := v_dados_inscricao->'dados_pessoais'->>'uf_crm';

  IF v_crm IS NOT NULL AND v_uf_crm IS NOT NULL THEN
    -- Buscar especialidade se houver ID
    IF v_dados_inscricao->'dados_pessoais'->>'especialidade_id' IS NOT NULL THEN
      v_especialidade_id := (v_dados_inscricao->'dados_pessoais'->>'especialidade_id')::UUID;
    END IF;

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
      COALESCE(
        v_dados_inscricao->'dados_pessoais'->>'especialidade',
        'Não informada'
      ),
      v_especialidade_id
    )
    ON CONFLICT (credenciado_id, crm, uf_crm) DO UPDATE SET
      especialidade = EXCLUDED.especialidade,
      especialidade_id = EXCLUDED.especialidade_id;

    RAISE NOTICE '✅ CRM principal %/% inserido', v_crm, v_uf_crm;
  END IF;

  -- Processar CRMs de consultórios (se houver)
  IF v_dados_inscricao->'consultorios' IS NOT NULL THEN
    FOR v_consultorio IN 
      SELECT jsonb_array_elements(v_dados_inscricao->'consultorios')
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

        RAISE NOTICE '✅ CRM de consultório %/% inserido', v_crm, v_uf_crm;
      END IF;
    END LOOP;
  END IF;

  -- Copiar consultórios de inscricao_consultorios
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

  RAISE NOTICE '✅ Consultórios copiados';

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ SYNC_FROM_CONTRACT concluído com sucesso';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  RETURN v_credenciado_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERRO no sync_from_contract: %', SQLERRM;
    RAISE;
END;
$$;