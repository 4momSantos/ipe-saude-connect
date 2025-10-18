-- =====================================================
-- SCRIPT DE CORREÇÃO EM MASSA: Processar inscrições órfãs
-- =====================================================

-- Criar função para corrigir inscrições órfãs em massa
CREATE OR REPLACE FUNCTION public.corrigir_inscricoes_orfas()
RETURNS TABLE (
  inscricao_id uuid,
  protocolo text,
  edital_numero text,
  status_anterior text,
  credenciado_criado boolean,
  credenciado_id uuid,
  erro text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inscricao RECORD;
  v_credenciado_id uuid;
  v_error_msg text;
BEGIN
  RAISE NOTICE '[CORRECAO_MASSA] Iniciando correção em massa de inscrições órfãs';
  
  -- Buscar todas as inscrições aprovadas sem credenciado em editais com fluxo programático
  FOR v_inscricao IN 
    SELECT 
      ie.id,
      ie.protocolo,
      ie.status,
      e.numero_edital
    FROM inscricoes_edital ie
    JOIN editais e ON e.id = ie.edital_id
    LEFT JOIN credenciados c ON c.inscricao_id = ie.id
    WHERE ie.status = 'aprovado'
      AND e.use_programmatic_flow = true
      AND c.id IS NULL
    ORDER BY ie.created_at ASC
  LOOP
    BEGIN
      RAISE NOTICE '[CORRECAO_MASSA] Processando inscrição % (protocolo: %)', 
        v_inscricao.id, v_inscricao.protocolo;
      
      -- Chamar função de sincronização
      PERFORM public.sync_approved_inscricao_to_credenciado_v2(v_inscricao.id);
      
      -- Verificar se credenciado foi criado
      SELECT c.id INTO v_credenciado_id
      FROM credenciados c
      WHERE c.inscricao_id = v_inscricao.id;
      
      IF v_credenciado_id IS NOT NULL THEN
        RAISE NOTICE '[CORRECAO_MASSA] ✅ Credenciado criado: %', v_credenciado_id;
        
        -- Retornar sucesso
        RETURN QUERY SELECT 
          v_inscricao.id,
          v_inscricao.protocolo,
          v_inscricao.numero_edital,
          v_inscricao.status,
          true,
          v_credenciado_id,
          NULL::text;
      ELSE
        RAISE WARNING '[CORRECAO_MASSA] ⚠️ Credenciado não foi criado para inscrição %', v_inscricao.id;
        
        -- Retornar falha
        RETURN QUERY SELECT 
          v_inscricao.id,
          v_inscricao.protocolo,
          v_inscricao.numero_edital,
          v_inscricao.status,
          false,
          NULL::uuid,
          'Credenciado não foi criado'::text;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Capturar erro e continuar
      v_error_msg := SQLERRM;
      RAISE WARNING '[CORRECAO_MASSA] ❌ Erro ao processar inscrição %: %', 
        v_inscricao.id, v_error_msg;
      
      -- Retornar erro
      RETURN QUERY SELECT 
        v_inscricao.id,
        v_inscricao.protocolo,
        v_inscricao.numero_edital,
        v_inscricao.status,
        false,
        NULL::uuid,
        v_error_msg;
    END;
  END LOOP;
  
  RAISE NOTICE '[CORRECAO_MASSA] ✅ Correção em massa finalizada';
END;
$$;

-- Criar função robusta de sincronização (versão v2 melhorada)
CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado_v2(p_inscricao_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_inscricao RECORD;
  v_dados jsonb;
  v_credenciado_id uuid;
  v_nome text;
  v_email text;
  v_telefone text;
  v_celular text;
  v_endereco_completo text;
  v_tipo_credenciamento text;
BEGIN
  RAISE NOTICE '[SYNC_V2] Processando inscrição %', p_inscricao_id;
  
  -- Buscar dados da inscrição
  SELECT 
    ie.*,
    e.titulo as edital_titulo
  INTO v_inscricao
  FROM inscricoes_edital ie
  JOIN editais e ON e.id = ie.edital_id
  WHERE ie.id = p_inscricao_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '[SYNC_V2] Inscrição não encontrada: %', p_inscricao_id;
  END IF;
  
  IF v_inscricao.status != 'aprovado' THEN
    RAISE EXCEPTION '[SYNC_V2] Inscrição não está aprovada (status: %)', v_inscricao.status;
  END IF;
  
  -- Verificar se credenciado já existe
  SELECT id INTO v_credenciado_id
  FROM credenciados
  WHERE inscricao_id = p_inscricao_id;
  
  IF v_credenciado_id IS NOT NULL THEN
    RAISE NOTICE '[SYNC_V2] Credenciado já existe: %', v_credenciado_id;
    RETURN v_credenciado_id;
  END IF;
  
  v_dados := v_inscricao.dados_inscricao;
  
  -- Detectar tipo de credenciamento
  IF v_dados->'pessoa_juridica'->>'cnpj' IS NOT NULL AND v_dados->'pessoa_juridica'->>'cnpj' != '' THEN
    v_tipo_credenciamento := 'PJ';
  ELSE
    v_tipo_credenciamento := 'PF';
  END IF;
  
  -- Extrair dados
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
    RAISE EXCEPTION '[SYNC_V2] Nome é obrigatório';
  END IF;
  
  -- Criar credenciado
  INSERT INTO credenciados (
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
    tipo_credenciamento
  )
  VALUES (
    p_inscricao_id,
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
    'Credenciado via correção em massa',
    v_inscricao.created_at,
    NOW(),
    CURRENT_DATE,
    v_tipo_credenciamento
  )
  RETURNING id INTO v_credenciado_id;
  
  RAISE NOTICE '[SYNC_V2] ✅ Credenciado criado: % (Tipo: %)', v_credenciado_id, v_tipo_credenciamento;
  
  -- Registrar histórico
  INSERT INTO credenciado_historico (credenciado_id, tipo, descricao, usuario_responsavel)
  VALUES (
    v_credenciado_id,
    'credenciamento',
    'Credenciamento via correção em massa - Fluxo programático',
    'Sistema'
  );
  
  RETURN v_credenciado_id;
END;
$$;