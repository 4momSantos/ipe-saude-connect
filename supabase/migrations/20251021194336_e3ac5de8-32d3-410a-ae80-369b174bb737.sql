-- =====================================================
-- CORREÇÃO: Trigger e Função de Datas de Credenciamento
-- =====================================================

-- 1. Recriar trigger para disparar em INSERT OR UPDATE
DROP TRIGGER IF EXISTS trg_registrar_datas_credenciamento ON public.credenciados;

CREATE TRIGGER trg_registrar_datas_credenciamento
  BEFORE INSERT OR UPDATE ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_datas_credenciamento();

-- 2. Melhorar função de preenchimento de datas
CREATE OR REPLACE FUNCTION public.registrar_datas_credenciamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Em INSERT: Preencher todas as datas se estiverem NULL
  IF TG_OP = 'INSERT' THEN
    NEW.data_solicitacao := COALESCE(NEW.data_solicitacao, NOW());
    NEW.data_habilitacao := COALESCE(NEW.data_habilitacao, NOW());
    NEW.data_inicio_atendimento := COALESCE(NEW.data_inicio_atendimento, CURRENT_DATE);
    
    RAISE NOTICE '[DATAS_AUTO] INSERT - Credenciado % com datas: solicitacao=%, habilitacao=%, inicio=%',
      NEW.id, NEW.data_solicitacao, NEW.data_habilitacao, NEW.data_inicio_atendimento;
  END IF;
  
  -- Em UPDATE: Preencher data_habilitacao e data_inicio_atendimento quando status muda para Ativo
  IF TG_OP = 'UPDATE' AND NEW.status = 'Ativo' AND COALESCE(OLD.status, '') != 'Ativo' THEN
    NEW.data_habilitacao := COALESCE(NEW.data_habilitacao, NOW());
    NEW.data_inicio_atendimento := COALESCE(NEW.data_inicio_atendimento, CURRENT_DATE);
    
    RAISE NOTICE '[DATAS_AUTO] UPDATE para Ativo - Credenciado % com datas: habilitacao=%, inicio=%',
      NEW.id, NEW.data_habilitacao, NEW.data_inicio_atendimento;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- CORREÇÃO: Busca Robusta de Endereço e Datas em sync_credenciado_from_contract
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_credenciado_from_contract(p_inscricao_id UUID)
RETURNS UUID AS $$
DECLARE
  v_dados_inscricao JSONB;
  v_dados_contrato JSONB;
  v_inscricao RECORD;
  v_contrato RECORD;
  v_credenciado_id UUID;
  v_nome TEXT;
  v_cpf_cnpj TEXT;
  v_email TEXT;
  v_telefone TEXT;
  v_cep TEXT;
  v_cidade TEXT;
  v_estado TEXT;
  v_endereco TEXT;
  v_data_solicitacao TIMESTAMPTZ;
  v_data_habilitacao TIMESTAMPTZ;
  v_data_inicio_atendimento DATE;
BEGIN
  RAISE NOTICE '[SYNC_CREDENCIADO] Iniciando sincronização para inscrição %', p_inscricao_id;

  -- Buscar dados da inscrição
  SELECT * INTO v_inscricao
  FROM public.inscricoes_edital
  WHERE id = p_inscricao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição não encontrada: %', p_inscricao_id;
  END IF;

  -- Buscar contrato assinado
  SELECT * INTO v_contrato
  FROM public.contratos
  WHERE inscricao_id = p_inscricao_id
    AND status = 'assinado'
  ORDER BY assinado_em DESC
  LIMIT 1;

  v_dados_inscricao := v_inscricao.dados_inscricao;
  v_dados_contrato := COALESCE(v_contrato.dados_contrato, '{}'::jsonb);

  RAISE NOTICE '[SYNC_CREDENCIADO] Estrutura JSON: %', jsonb_pretty(v_dados_inscricao);

  -- Extrair dados básicos
  v_nome := COALESCE(
    v_dados_inscricao->'dados_pessoais'->>'denominacao_social',
    v_dados_inscricao->'dadosPessoais'->>'denominacaoSocial',
    v_dados_inscricao->'dados_pessoais'->>'nome_completo',
    v_dados_inscricao->'dadosPessoais'->>'nomeCompleto',
    v_dados_contrato->>'candidato_nome',
    'Nome não informado'
  );

  v_cpf_cnpj := COALESCE(
    v_dados_inscricao->'dados_pessoais'->>'cnpj',
    v_dados_inscricao->'dadosPessoais'->>'cnpj',
    v_dados_inscricao->'dados_pessoais'->>'cpf',
    v_dados_inscricao->'dadosPessoais'->>'cpf',
    v_dados_contrato->>'candidato_cpf_cnpj'
  );

  v_email := COALESCE(
    v_dados_inscricao->'dados_pessoais'->>'email',
    v_dados_inscricao->'dadosPessoais'->>'email',
    v_dados_inscricao->'contato'->>'email',
    v_dados_contrato->>'candidato_email'
  );

  v_telefone := COALESCE(
    v_dados_inscricao->'dados_pessoais'->>'telefone',
    v_dados_inscricao->'dadosPessoais'->>'telefone',
    v_dados_inscricao->'contato'->>'telefone',
    v_dados_contrato->>'candidato_telefone'
  );

  -- ===== BUSCA ROBUSTA DE ENDEREÇO COM MÚLTIPLOS FALLBACKS =====
  
  -- CEP (5 fontes)
  v_cep := COALESCE(
    v_dados_inscricao->'endereco_correspondencia'->>'cep',
    v_dados_inscricao->'endereco'->>'cep',
    v_dados_inscricao->'dadosPessoais'->'endereco'->>'cep',
    v_dados_inscricao->'dados_pessoais'->'endereco'->>'cep',
    v_dados_inscricao->'dados_pessoais'->>'cep',
    v_dados_inscricao->'consultorio'->>'cep',
    v_dados_contrato->>'candidato_cep'
  );

  -- Cidade (5 fontes)
  v_cidade := COALESCE(
    v_dados_inscricao->'endereco_correspondencia'->>'cidade',
    v_dados_inscricao->'endereco'->>'cidade',
    v_dados_inscricao->'dadosPessoais'->'endereco'->>'cidade',
    v_dados_inscricao->'dados_pessoais'->'endereco'->>'cidade',
    v_dados_inscricao->'dados_pessoais'->>'cidade',
    v_dados_inscricao->'consultorio'->>'cidade',
    v_dados_contrato->>'candidato_cidade'
  );

  -- Estado (tratando uf e estado como sinônimos - 5 fontes)
  v_estado := COALESCE(
    v_dados_inscricao->'endereco_correspondencia'->>'uf',
    v_dados_inscricao->'endereco_correspondencia'->>'estado',
    v_dados_inscricao->'endereco'->>'uf',
    v_dados_inscricao->'endereco'->>'estado',
    v_dados_inscricao->'dadosPessoais'->'endereco'->>'uf',
    v_dados_inscricao->'dadosPessoais'->'endereco'->>'estado',
    v_dados_inscricao->'dados_pessoais'->'endereco'->>'uf',
    v_dados_inscricao->'dados_pessoais'->'endereco'->>'estado',
    v_dados_inscricao->'dados_pessoais'->>'uf',
    v_dados_inscricao->'dados_pessoais'->>'estado',
    v_dados_inscricao->'consultorio'->>'estado',
    v_dados_contrato->>'candidato_estado'
  );

  -- Endereço (logradouro ou endereco_completo - 5 fontes)
  v_endereco := COALESCE(
    v_dados_inscricao->'endereco_correspondencia'->>'logradouro',
    v_dados_inscricao->'endereco_correspondencia'->>'endereco_completo',
    v_dados_inscricao->'endereco'->>'logradouro',
    v_dados_inscricao->'endereco'->>'endereco_completo',
    v_dados_inscricao->'dadosPessoais'->'endereco'->>'logradouro',
    v_dados_inscricao->'dadosPessoais'->'endereco'->>'enderecoCompleto',
    v_dados_inscricao->'dados_pessoais'->'endereco'->>'logradouro',
    v_dados_inscricao->'dados_pessoais'->>'endereco',
    v_dados_inscricao->'consultorio'->>'endereco',
    v_dados_contrato->>'candidato_endereco'
  );

  RAISE NOTICE '[SYNC_CREDENCIADO] Endereço extraído - CEP: %, Cidade: %, Estado: %, Endereco: %',
    v_cep, v_cidade, v_estado, v_endereco;

  -- ===== BUSCA DE DATAS COM FALLBACK =====
  
  -- data_solicitacao: de inscricoes_edital.created_at
  v_data_solicitacao := COALESCE(v_inscricao.created_at, NOW());
  
  -- data_habilitacao: de contratos.assinado_em ou NOW()
  v_data_habilitacao := COALESCE(v_contrato.assinado_em, NOW());
  
  -- data_inicio_atendimento: CURRENT_DATE
  v_data_inicio_atendimento := CURRENT_DATE;

  RAISE NOTICE '[SYNC_CREDENCIADO] Datas - Solicitacao: %, Habilitacao: %, Inicio: %',
    v_data_solicitacao, v_data_habilitacao, v_data_inicio_atendimento;

  -- Verificar se credenciado já existe
  SELECT id INTO v_credenciado_id
  FROM public.credenciados
  WHERE inscricao_id = p_inscricao_id;

  IF v_credenciado_id IS NOT NULL THEN
    -- Atualizar credenciado existente (inclusive datas se estiverem NULL)
    UPDATE public.credenciados
    SET
      nome = v_nome,
      cpf = CASE WHEN length(regexp_replace(v_cpf_cnpj, '\D', '', 'g')) = 11 THEN v_cpf_cnpj ELSE cpf END,
      cnpj = CASE WHEN length(regexp_replace(v_cpf_cnpj, '\D', '', 'g')) = 14 THEN v_cpf_cnpj ELSE cnpj END,
      email = COALESCE(v_email, email),
      telefone = COALESCE(v_telefone, telefone),
      cep = COALESCE(v_cep, cep),
      cidade = COALESCE(v_cidade, cidade),
      estado = COALESCE(v_estado, estado),
      endereco = COALESCE(v_endereco, endereco),
      data_solicitacao = COALESCE(data_solicitacao, v_data_solicitacao),
      data_habilitacao = COALESCE(data_habilitacao, v_data_habilitacao),
      data_inicio_atendimento = COALESCE(data_inicio_atendimento, v_data_inicio_atendimento),
      updated_at = NOW()
    WHERE id = v_credenciado_id;

    RAISE NOTICE '[SYNC_CREDENCIADO] ✅ Credenciado % atualizado', v_credenciado_id;
  ELSE
    -- Criar novo credenciado (COM DATAS)
    INSERT INTO public.credenciados (
      inscricao_id,
      nome,
      cpf,
      cnpj,
      email,
      telefone,
      cep,
      cidade,
      estado,
      endereco,
      data_solicitacao,
      data_habilitacao,
      data_inicio_atendimento,
      status
    )
    VALUES (
      p_inscricao_id,
      v_nome,
      CASE WHEN length(regexp_replace(v_cpf_cnpj, '\D', '', 'g')) = 11 THEN v_cpf_cnpj ELSE NULL END,
      CASE WHEN length(regexp_replace(v_cpf_cnpj, '\D', '', 'g')) = 14 THEN v_cpf_cnpj ELSE NULL END,
      v_email,
      v_telefone,
      v_cep,
      v_cidade,
      v_estado,
      v_endereco,
      v_data_solicitacao,
      v_data_habilitacao,
      v_data_inicio_atendimento,
      'Ativo'
    )
    RETURNING id INTO v_credenciado_id;

    RAISE NOTICE '[SYNC_CREDENCIADO] ✅ Novo credenciado % criado com datas', v_credenciado_id;
  END IF;

  RETURN v_credenciado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;