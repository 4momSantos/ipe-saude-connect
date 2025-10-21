-- Corrigir função para acessar consultorio dentro de dados_inscricao
CREATE OR REPLACE FUNCTION public.sync_credenciado_from_contract(p_inscricao_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credenciado_id UUID;
  v_dados_contrato JSONB;
  v_dados_inscricao JSONB;
BEGIN
  -- Buscar dados do contrato e da inscrição
  SELECT 
    c.dados_contrato,
    ie.dados_inscricao
  INTO 
    v_dados_contrato,
    v_dados_inscricao
  FROM contratos c
  JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
  WHERE c.inscricao_id = p_inscricao_id
  AND c.status = 'assinado'
  ORDER BY c.assinado_em DESC
  LIMIT 1;

  IF v_dados_contrato IS NULL THEN
    RAISE EXCEPTION 'Contrato assinado não encontrado para inscrição %', p_inscricao_id;
  END IF;

  -- UPSERT do credenciado usando dados_contrato como prioridade
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
    cep,
    cidade,
    estado,
    status,
    data_habilitacao,
    created_at,
    updated_at
  )
  VALUES (
    p_inscricao_id,
    -- Dados pessoais: priorizar contrato
    COALESCE(v_dados_contrato->>'candidato_nome', 'Não informado'),
    COALESCE(
      v_dados_contrato->>'candidato_cpf',
      v_dados_inscricao->'dados_pessoais'->>'cpf'
    ),
    COALESCE(
      v_dados_contrato->>'candidato_rg',
      v_dados_inscricao->'dados_pessoais'->>'rg'
    ),
    COALESCE(
      v_dados_contrato->>'candidato_email',
      v_dados_inscricao->'dados_pessoais'->>'email'
    ),
    COALESCE(
      v_dados_contrato->>'candidato_telefone',
      v_dados_inscricao->'dados_pessoais'->>'telefone'
    ),
    COALESCE(
      v_dados_contrato->>'candidato_celular',
      v_dados_inscricao->'dados_pessoais'->>'celular'
    ),
    (v_dados_contrato->>'candidato_data_nascimento')::date,
    -- Endereço: usar endereco_completo do contrato
    COALESCE(
      v_dados_contrato->>'candidato_endereco_completo',
      v_dados_inscricao->'endereco_correspondencia'->>'logradouro',
      v_dados_inscricao->'endereco'->>'logradouro'
    ),
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'cep',
      v_dados_inscricao->'endereco'->>'cep'
    ),
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'cidade',
      v_dados_inscricao->'endereco'->>'cidade'
    ),
    COALESCE(
      v_dados_inscricao->'endereco_correspondencia'->>'uf',
      v_dados_inscricao->'endereco'->>'estado'
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
    cep = EXCLUDED.cep,
    cidade = EXCLUDED.cidade,
    estado = EXCLUDED.estado,
    updated_at = NOW()
  RETURNING id INTO v_credenciado_id;

  -- Sincronizar CRMs do consultorio (se houver em dados_inscricao)
  IF v_dados_inscricao->'consultorio'->'crms' IS NOT NULL AND 
     jsonb_typeof(v_dados_inscricao->'consultorio'->'crms') = 'array' THEN
    
    -- Deletar CRMs antigos
    DELETE FROM credenciado_crms WHERE credenciado_id = v_credenciado_id;
    
    -- Inserir CRMs do consultório
    INSERT INTO credenciado_crms (credenciado_id, crm, uf_crm, especialidade, especialidade_id)
    SELECT 
      v_credenciado_id,
      (crm_item->>'numero')::text,
      (crm_item->>'uf')::text,
      COALESCE((crm_item->>'especialidade')::text, 'Não especificada'),
      (crm_item->>'especialidade_id')::uuid
    FROM jsonb_array_elements(v_dados_inscricao->'consultorio'->'crms') AS crm_item
    WHERE crm_item->>'numero' IS NOT NULL;
  END IF;

  RAISE NOTICE 'Credenciado % sincronizado com sucesso', v_credenciado_id;
  RETURN v_credenciado_id;
END;
$$;