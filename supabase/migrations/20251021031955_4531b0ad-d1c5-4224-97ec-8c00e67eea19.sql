-- Corrigir função sync_credenciado_from_contract para garantir que município seja exibido
-- CEP é obrigatório, então sempre deve buscar município dos dados da inscrição

CREATE OR REPLACE FUNCTION public.sync_credenciado_from_contract(p_inscricao_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credenciado_id uuid;
  v_dados_contrato jsonb;
  v_dados_inscricao jsonb;
  v_crm text;
  v_uf_crm text;
  v_especialidade_id uuid;
  v_especialidade_nome text;
  v_cidade text;
  v_estado text;
  v_cep text;
  v_endereco text;
BEGIN
  -- Buscar dados do contrato e inscrição
  SELECT ct.dados_contrato, ie.dados_inscricao
  INTO v_dados_contrato, v_dados_inscricao
  FROM contratos ct
  JOIN inscricoes_edital ie ON ie.id = ct.inscricao_id
  WHERE ct.inscricao_id = p_inscricao_id
  LIMIT 1;

  IF v_dados_contrato IS NULL THEN
    RAISE EXCEPTION 'Contrato não encontrado para inscrição %', p_inscricao_id;
  END IF;

  -- Verificar se já existe credenciado
  SELECT id INTO v_credenciado_id
  FROM credenciados
  WHERE inscricao_id = p_inscricao_id;

  -- Extrair CRM dos dados pessoais
  v_crm := v_dados_inscricao->'dados_pessoais'->>'crm';
  v_uf_crm := v_dados_inscricao->'dados_pessoais'->>'uf_crm';

  -- Extrair endereço (priorizar dados_inscricao pois CEP é obrigatório lá)
  v_cep := COALESCE(
    v_dados_inscricao->'dados_pessoais'->>'cep',
    v_dados_inscricao->>'cep',
    v_dados_contrato->>'candidato_cep'
  );
  
  v_cidade := COALESCE(
    v_dados_inscricao->'dados_pessoais'->>'cidade',
    v_dados_inscricao->>'cidade',
    v_dados_contrato->>'candidato_cidade'
  );
  
  v_estado := COALESCE(
    v_dados_inscricao->'dados_pessoais'->>'estado',
    v_dados_inscricao->>'estado',
    v_dados_contrato->>'candidato_estado'
  );
  
  v_endereco := COALESCE(
    v_dados_inscricao->'dados_pessoais'->>'endereco_completo',
    v_dados_inscricao->>'endereco_completo',
    v_dados_contrato->>'candidato_endereco_completo'
  );

  -- Se credenciado existe, atualizar
  IF v_credenciado_id IS NOT NULL THEN
    UPDATE credenciados SET
      nome = COALESCE(v_dados_contrato->>'candidato_nome', nome),
      cpf = COALESCE(v_dados_contrato->>'candidato_cpf', cpf),
      rg = COALESCE(v_dados_contrato->>'candidato_rg', rg),
      email = COALESCE(v_dados_contrato->>'candidato_email', email),
      telefone = COALESCE(v_dados_contrato->>'candidato_telefone', telefone),
      celular = COALESCE(v_dados_contrato->>'candidato_celular', celular),
      cep = COALESCE(v_cep, cep),
      endereco = COALESCE(v_endereco, endereco),
      cidade = COALESCE(v_cidade, cidade),
      estado = COALESCE(v_estado, estado),
      data_nascimento = CASE
        WHEN v_dados_contrato->>'candidato_data_nascimento' IS NOT NULL 
        THEN (v_dados_contrato->>'candidato_data_nascimento')::date
        ELSE data_nascimento
      END,
      updated_at = now()
    WHERE id = v_credenciado_id;
  ELSE
    -- Criar novo credenciado
    INSERT INTO credenciados (
      inscricao_id, nome, cpf, rg, email, telefone, celular,
      cep, endereco, cidade, estado, data_nascimento,
      status, created_at, updated_at
    ) VALUES (
      p_inscricao_id,
      v_dados_contrato->>'candidato_nome',
      v_dados_contrato->>'candidato_cpf',
      v_dados_contrato->>'candidato_rg',
      v_dados_contrato->>'candidato_email',
      v_dados_contrato->>'candidato_telefone',
      v_dados_contrato->>'candidato_celular',
      v_cep,
      v_endereco,
      v_cidade,
      v_estado,
      (v_dados_contrato->>'candidato_data_nascimento')::date,
      'Ativo',
      now(),
      now()
    )
    RETURNING id INTO v_credenciado_id;
  END IF;

  -- Remover CRMs antigos
  DELETE FROM credenciado_crms WHERE credenciado_id = v_credenciado_id;

  -- Inserir CRM se existir
  IF v_crm IS NOT NULL AND v_uf_crm IS NOT NULL THEN
    -- Buscar especialidades do consultório
    FOR v_especialidade_id IN 
      SELECT jsonb_array_elements_text(v_dados_inscricao->'consultorio'->'especialidades_ids')::uuid
    LOOP
      -- Buscar nome da especialidade
      SELECT nome INTO v_especialidade_nome
      FROM especialidades_medicas
      WHERE id = v_especialidade_id;

      -- Inserir CRM com especialidade (ON CONFLICT para evitar duplicatas)
      IF v_especialidade_nome IS NOT NULL THEN
        INSERT INTO credenciado_crms (
          credenciado_id, crm, uf_crm, especialidade, especialidade_id
        ) VALUES (
          v_credenciado_id, v_crm, v_uf_crm, v_especialidade_nome, v_especialidade_id
        )
        ON CONFLICT (credenciado_id, crm, uf_crm, especialidade_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_credenciado_id;
END;
$$;