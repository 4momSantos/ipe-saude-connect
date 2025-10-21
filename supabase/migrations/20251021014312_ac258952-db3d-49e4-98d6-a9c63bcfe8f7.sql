-- ============================================
-- CORREÇÃO COMPLETA DO SISTEMA DE CREDENCIAMENTO
-- ============================================

-- 1. Investigar e corrigir constraint de credenciado_historico
-- Remover constraint problemática se existir
ALTER TABLE IF EXISTS public.credenciado_historico 
DROP CONSTRAINT IF EXISTS credenciado_historico_tipo_check;

-- 2. Reescrever função completa de sincronização
CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado_v2(p_inscricao_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credenciado_id UUID;
  v_inscricao RECORD;
  v_contrato RECORD;
  v_dados JSONB;
  v_dados_contrato JSONB;
  
  -- Dados extraídos
  v_nome TEXT;
  v_cpf TEXT;
  v_rg TEXT;
  v_email TEXT;
  v_telefone TEXT;
  v_celular TEXT;
  v_crm TEXT;
  v_crm_uf TEXT;
  v_cep TEXT;
  v_endereco TEXT;
  v_numero TEXT;
  v_complemento TEXT;
  v_bairro TEXT;
  v_cidade TEXT;
  v_estado TEXT;
  v_tipo_pessoa TEXT;
  v_cnpj TEXT;
  v_razao_social TEXT;
  v_nome_fantasia TEXT;
  v_especialidade_ids UUID[];
BEGIN
  RAISE NOTICE '[CREDENCIADO_SYNC_V2] Iniciando sincronização para inscrição %', p_inscricao_id;
  
  -- Buscar inscrição
  SELECT * INTO v_inscricao
  FROM public.inscricoes_edital
  WHERE id = p_inscricao_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscrição não encontrada: %', p_inscricao_id;
  END IF;
  
  -- Buscar contrato relacionado
  SELECT * INTO v_contrato
  FROM public.contratos
  WHERE inscricao_id = p_inscricao_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Prioridade 1: dados_contrato (mais completos e formatados)
  IF v_contrato.dados_contrato IS NOT NULL THEN
    v_dados_contrato := v_contrato.dados_contrato;
    RAISE NOTICE '[CREDENCIADO_SYNC_V2] Usando dados_contrato do contrato %', v_contrato.numero_contrato;
    
    -- Extrair dados pessoais
    v_nome := v_dados_contrato->>'nome_completo';
    v_cpf := v_dados_contrato->>'cpf';
    v_rg := v_dados_contrato->>'rg';
    v_email := v_dados_contrato->>'email';
    v_telefone := v_dados_contrato->>'telefone';
    v_celular := v_dados_contrato->>'celular';
    
    -- Extrair CRM
    v_crm := v_dados_contrato->>'crm';
    v_crm_uf := v_dados_contrato->>'crm_uf';
    
    -- Extrair endereço
    v_cep := v_dados_contrato->>'cep';
    v_endereco := v_dados_contrato->>'endereco';
    v_numero := v_dados_contrato->>'numero';
    v_complemento := v_dados_contrato->>'complemento';
    v_bairro := v_dados_contrato->>'bairro';
    v_cidade := v_dados_contrato->>'cidade';
    v_estado := v_dados_contrato->>'estado';
    
    -- Extrair tipo de pessoa
    v_tipo_pessoa := v_dados_contrato->>'tipo_pessoa';
    v_cnpj := v_dados_contrato->>'cnpj';
    v_razao_social := v_dados_contrato->>'razao_social';
    v_nome_fantasia := v_dados_contrato->>'nome_fantasia';
    
    -- Extrair especialidades
    IF v_dados_contrato->'especialidades' IS NOT NULL THEN
      SELECT ARRAY_AGG(elem::UUID)
      INTO v_especialidade_ids
      FROM jsonb_array_elements_text(v_dados_contrato->'especialidades') elem;
    END IF;
  END IF;
  
  -- Prioridade 2: dados_inscricao (fallback)
  IF v_inscricao.dados_inscricao IS NOT NULL THEN
    v_dados := v_inscricao.dados_inscricao;
    
    -- Preencher campos vazios com dados da inscrição
    IF v_dados->'dadosPessoais' IS NOT NULL THEN
      v_nome := COALESCE(v_nome, v_dados->'dadosPessoais'->>'nomeCompleto');
      v_cpf := COALESCE(v_cpf, v_dados->'dadosPessoais'->>'cpf');
      v_rg := COALESCE(v_rg, v_dados->'dadosPessoais'->>'rg');
      v_email := COALESCE(v_email, v_dados->'dadosPessoais'->>'email');
      v_telefone := COALESCE(v_telefone, v_dados->'dadosPessoais'->>'telefone');
      v_celular := COALESCE(v_celular, v_dados->'dadosPessoais'->>'celular');
    END IF;
    
    IF v_dados->'dadosProfissionais' IS NOT NULL THEN
      v_crm := COALESCE(v_crm, v_dados->'dadosProfissionais'->>'numeroCRM');
      v_crm_uf := COALESCE(v_crm_uf, v_dados->'dadosProfissionais'->>'ufCRM');
    END IF;
    
    IF v_dados->'endereco' IS NOT NULL THEN
      v_cep := COALESCE(v_cep, v_dados->'endereco'->>'cep');
      v_endereco := COALESCE(v_endereco, v_dados->'endereco'->>'logradouro');
      v_numero := COALESCE(v_numero, v_dados->'endereco'->>'numero');
      v_complemento := COALESCE(v_complemento, v_dados->'endereco'->>'complemento');
      v_bairro := COALESCE(v_bairro, v_dados->'endereco'->>'bairro');
      v_cidade := COALESCE(v_cidade, v_dados->'endereco'->>'cidade');
      v_estado := COALESCE(v_estado, v_dados->'endereco'->>'estado');
    END IF;
    
    IF v_dados->'dadosPJ' IS NOT NULL THEN
      v_tipo_pessoa := 'PJ';
      v_cnpj := COALESCE(v_cnpj, v_dados->'dadosPJ'->>'cnpj');
      v_razao_social := COALESCE(v_razao_social, v_dados->'dadosPJ'->>'razaoSocial');
      v_nome_fantasia := COALESCE(v_nome_fantasia, v_dados->'dadosPJ'->>'nomeFantasia');
    ELSE
      v_tipo_pessoa := COALESCE(v_tipo_pessoa, 'PF');
    END IF;
    
    IF v_especialidade_ids IS NULL AND v_dados->'especialidades' IS NOT NULL THEN
      SELECT ARRAY_AGG(elem::UUID)
      INTO v_especialidade_ids
      FROM jsonb_array_elements_text(v_dados->'especialidades') elem
      WHERE elem ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    END IF;
  END IF;
  
  -- Validação mínima
  IF v_nome IS NULL OR v_cpf IS NULL THEN
    RAISE EXCEPTION 'Dados mínimos ausentes (nome: %, cpf: %)', v_nome, v_cpf;
  END IF;
  
  RAISE NOTICE '[CREDENCIADO_SYNC_V2] Dados extraídos: nome=%, cpf=%, email=%, crm=%, tipo=%', 
    v_nome, v_cpf, v_email, v_crm, v_tipo_pessoa;
  
  -- Verificar se credenciado já existe
  SELECT id INTO v_credenciado_id
  FROM public.credenciados
  WHERE inscricao_id = p_inscricao_id;
  
  IF v_credenciado_id IS NOT NULL THEN
    RAISE NOTICE '[CREDENCIADO_SYNC_V2] Atualizando credenciado existente %', v_credenciado_id;
    
    -- Atualizar credenciado
    UPDATE public.credenciados
    SET
      nome = v_nome,
      cpf = v_cpf,
      rg = v_rg,
      email = v_email,
      telefone = v_telefone,
      celular = v_celular,
      crm = v_crm,
      crm_uf = v_crm_uf,
      cep = v_cep,
      endereco = v_endereco,
      numero = v_numero,
      complemento = v_complemento,
      bairro = v_bairro,
      cidade = v_cidade,
      estado = v_estado,
      tipo_pessoa = v_tipo_pessoa,
      cnpj = v_cnpj,
      razao_social = v_razao_social,
      nome_fantasia = v_nome_fantasia,
      especialidade_ids = v_especialidade_ids,
      status = 'Ativo',
      data_credenciamento = COALESCE(data_credenciamento, NOW()),
      updated_at = NOW()
    WHERE id = v_credenciado_id;
  ELSE
    RAISE NOTICE '[CREDENCIADO_SYNC_V2] Criando novo credenciado';
    
    -- Criar credenciado
    INSERT INTO public.credenciados (
      inscricao_id,
      nome,
      cpf,
      rg,
      email,
      telefone,
      celular,
      crm,
      crm_uf,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      tipo_pessoa,
      cnpj,
      razao_social,
      nome_fantasia,
      especialidade_ids,
      status,
      data_credenciamento
    ) VALUES (
      p_inscricao_id,
      v_nome,
      v_cpf,
      v_rg,
      v_email,
      v_telefone,
      v_celular,
      v_crm,
      v_crm_uf,
      v_cep,
      v_endereco,
      v_numero,
      v_complemento,
      v_bairro,
      v_cidade,
      v_estado,
      v_tipo_pessoa,
      v_cnpj,
      v_razao_social,
      v_nome_fantasia,
      v_especialidade_ids,
      'Ativo',
      NOW()
    )
    RETURNING id INTO v_credenciado_id;
  END IF;
  
  RAISE NOTICE '[CREDENCIADO_SYNC_V2] ✅ Credenciado % criado/atualizado com sucesso', v_credenciado_id;
  
  RETURN v_credenciado_id;
END;
$function$;

-- 3. Atualizar trigger com melhor tratamento de erros
CREATE OR REPLACE FUNCTION public.activate_credenciado_on_assinatura()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credenciado_id UUID;
  v_error_detail TEXT;
BEGIN
  IF NEW.status = 'assinado' AND (OLD IS NULL OR OLD.status != 'assinado') THEN
    RAISE NOTICE '[CONTRATO_ASSINADO] Processando contrato % para inscrição %', 
      NEW.numero_contrato, NEW.inscricao_id;
    
    BEGIN
      -- Chamar função robusta de criação
      v_credenciado_id := sync_approved_inscricao_to_credenciado_v2(NEW.inscricao_id);
      
      RAISE NOTICE '[CONTRATO_ASSINADO] ✅ Credenciado % criado para contrato %', 
        v_credenciado_id, NEW.numero_contrato;
        
      -- Registrar no histórico do credenciado
      INSERT INTO public.credenciado_historico (
        credenciado_id,
        alterado_por,
        alterado_por_nome,
        evento,
        detalhes
      )
      VALUES (
        v_credenciado_id,
        auth.uid(),
        'Sistema - Assinatura de Contrato',
        'credenciado_criado_por_assinatura',
        jsonb_build_object(
          'contrato_id', NEW.id,
          'numero_contrato', NEW.numero_contrato,
          'inscricao_id', NEW.inscricao_id
        )
      );
      
    EXCEPTION WHEN OTHERS THEN
      v_error_detail := format('Erro: %s | Estado: %s', SQLERRM, SQLSTATE);
      RAISE WARNING '[CONTRATO_ASSINADO] ❌ Falha ao criar credenciado: %', v_error_detail;
      
      -- Criar workflow message para alerta
      INSERT INTO public.workflow_messages (
        inscricao_id,
        sender_type,
        content,
        tipo,
        visivel_para,
        manifestacao_metadata
      ) VALUES (
        NEW.inscricao_id,
        'sistema',
        format('⚠️ ERRO: Falha ao criar credenciado após assinatura do contrato %s. Erro: %s', 
          NEW.numero_contrato, v_error_detail),
        'alerta',
        ARRAY['analista', 'gestor'],
        jsonb_build_object(
          'error', v_error_detail,
          'contrato_id', NEW.id,
          'timestamp', NOW()
        )
      );
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. Criar funções de auditoria
CREATE OR REPLACE FUNCTION public.verificar_contratos_sem_credenciado()
RETURNS TABLE(
  contrato_id UUID,
  numero_contrato TEXT,
  inscricao_id UUID,
  status TEXT,
  assinado_em TIMESTAMPTZ,
  tem_dados_contrato BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.numero_contrato,
    c.inscricao_id,
    c.status,
    c.assinado_em,
    (c.dados_contrato IS NOT NULL) as tem_dados_contrato
  FROM public.contratos c
  LEFT JOIN public.credenciados cr ON cr.inscricao_id = c.inscricao_id
  WHERE c.status = 'assinado'
    AND cr.id IS NULL
  ORDER BY c.assinado_em DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.verificar_credenciados_incompletos()
RETURNS TABLE(
  credenciado_id UUID,
  nome TEXT,
  cpf TEXT,
  tem_email BOOLEAN,
  tem_crm BOOLEAN,
  tem_endereco BOOLEAN,
  campos_faltantes TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.nome,
    c.cpf,
    (c.email IS NOT NULL) as tem_email,
    (c.crm IS NOT NULL) as tem_crm,
    (c.endereco IS NOT NULL AND c.cidade IS NOT NULL) as tem_endereco,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN c.email IS NULL THEN 'email' END,
      CASE WHEN c.crm IS NULL THEN 'crm' END,
      CASE WHEN c.endereco IS NULL THEN 'endereco' END,
      CASE WHEN c.cidade IS NULL THEN 'cidade' END,
      CASE WHEN c.telefone IS NULL AND c.celular IS NULL THEN 'telefone/celular' END
    ], NULL) as campos_faltantes
  FROM public.credenciados c
  WHERE c.status = 'Ativo'
    AND (
      c.email IS NULL
      OR c.crm IS NULL
      OR c.endereco IS NULL
      OR c.cidade IS NULL
      OR (c.telefone IS NULL AND c.celular IS NULL)
    )
  ORDER BY c.created_at DESC;
END;
$function$;

-- 5. Processar contrato CONT-2025-289812 especificamente
DO $$
DECLARE
  v_inscricao_id UUID;
  v_credenciado_id UUID;
BEGIN
  -- Buscar ID da inscrição do contrato
  SELECT inscricao_id INTO v_inscricao_id
  FROM public.contratos
  WHERE numero_contrato = 'CONT-2025-289812';
  
  IF v_inscricao_id IS NOT NULL THEN
    RAISE NOTICE '[CORREÇÃO] Processando contrato CONT-2025-289812 (inscrição %)', v_inscricao_id;
    
    BEGIN
      v_credenciado_id := sync_approved_inscricao_to_credenciado_v2(v_inscricao_id);
      RAISE NOTICE '[CORREÇÃO] ✅ Credenciado % criado para CONT-2025-289812', v_credenciado_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[CORREÇÃO] ❌ Erro ao processar CONT-2025-289812: %', SQLERRM;
    END;
  ELSE
    RAISE WARNING '[CORREÇÃO] Contrato CONT-2025-289812 não encontrado';
  END IF;
END $$;