-- Atualizar credenciados existentes com data_solicitacao da inscrição
UPDATE credenciados c
SET data_solicitacao = ie.created_at
FROM inscricoes_edital ie
WHERE ie.id = c.inscricao_id
  AND c.data_solicitacao IS NULL;

-- Atualizar a trigger para preencher data_solicitacao
CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado()
RETURNS TRIGGER AS $$
DECLARE
  v_credenciado_id UUID;
  v_numero_credenciado TEXT;
  v_data_habilitacao TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Define data de habilitação como agora se ainda não existe
  v_data_habilitacao := COALESCE(NEW.data_habilitacao, NOW());

  -- Verifica se já existe um credenciado para esta inscrição
  SELECT id INTO v_credenciado_id
  FROM credenciados
  WHERE inscricao_id = NEW.id;

  IF v_credenciado_id IS NULL THEN
    -- Gera número sequencial para o credenciado
    v_numero_credenciado := 'CRED-' || LPAD(nextval('credenciados_numero_seq')::TEXT, 6, '0');

    -- Insere novo credenciado
    INSERT INTO credenciados (
      inscricao_id,
      numero_credenciado,
      nome,
      cpf,
      cnpj,
      tipo_credenciamento,
      email,
      telefone,
      celular,
      endereco,
      cidade,
      estado,
      cep,
      status,
      data_solicitacao,
      data_habilitacao,
      data_inicio_atendimento
    ) VALUES (
      NEW.id,
      v_numero_credenciado,
      COALESCE(NEW.dados_inscricao->>'nome_completo', NEW.dados_inscricao->>'razao_social', 'Nome não informado'),
      NEW.dados_inscricao->>'cpf',
      NEW.dados_inscricao->>'cnpj',
      NEW.tipo_credenciamento,
      NEW.dados_inscricao->>'email',
      NEW.dados_inscricao->>'telefone',
      NEW.dados_inscricao->>'celular',
      NEW.dados_inscricao->>'endereco',
      NEW.dados_inscricao->>'cidade',
      NEW.dados_inscricao->>'estado',
      NEW.dados_inscricao->>'cep',
      'Ativo',
      NEW.created_at,
      v_data_habilitacao,
      v_data_habilitacao::date
    )
    RETURNING id INTO v_credenciado_id;

  ELSE
    -- Atualiza credenciado existente
    UPDATE credenciados
    SET
      nome = COALESCE(NEW.dados_inscricao->>'nome_completo', NEW.dados_inscricao->>'razao_social', nome),
      cpf = COALESCE(NEW.dados_inscricao->>'cpf', cpf),
      cnpj = COALESCE(NEW.dados_inscricao->>'cnpj', cnpj),
      tipo_credenciamento = COALESCE(NEW.tipo_credenciamento, tipo_credenciamento),
      email = COALESCE(NEW.dados_inscricao->>'email', email),
      telefone = COALESCE(NEW.dados_inscricao->>'telefone', telefone),
      celular = COALESCE(NEW.dados_inscricao->>'celular', celular),
      endereco = COALESCE(NEW.dados_inscricao->>'endereco', endereco),
      cidade = COALESCE(NEW.dados_inscricao->>'cidade', cidade),
      estado = COALESCE(NEW.dados_inscricao->>'estado', estado),
      cep = COALESCE(NEW.dados_inscricao->>'cep', cep),
      data_solicitacao = COALESCE(data_solicitacao, NEW.created_at),
      data_habilitacao = COALESCE(data_habilitacao, v_data_habilitacao),
      data_inicio_atendimento = COALESCE(data_inicio_atendimento, v_data_habilitacao::date),
      updated_at = NOW()
    WHERE id = v_credenciado_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;