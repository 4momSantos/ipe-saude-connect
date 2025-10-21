-- ============================================================================
-- MIGRATION: Correção Definitiva - sync_approved_inscricao_to_credenciado
-- ============================================================================
-- Problema: Múltiplas versões da função usando nomes de colunas incorretos
-- Solução: Dropar TODAS as versões e recriar com nomes corretos
-- ============================================================================

-- Remover TODOS os triggers relacionados
DROP TRIGGER IF EXISTS trg_validate_status_change ON inscricoes_edital;
DROP TRIGGER IF EXISTS trg_sync_approved_to_credenciado ON inscricoes_edital;
DROP TRIGGER IF EXISTS trigger_sync_approved_inscricao_to_credenciado ON inscricoes_edital;
DROP TRIGGER IF EXISTS trg_auto_create_credenciado ON inscricoes_edital;

-- Remover TODAS as versões das funções
DROP FUNCTION IF EXISTS validate_inscricao_status_change() CASCADE;
DROP FUNCTION IF EXISTS sync_approved_inscricao_to_credenciado() CASCADE;
DROP FUNCTION IF EXISTS sync_approved_inscricao_to_credenciado_v2(uuid) CASCADE;

-- ============================================================================
-- Recriar função com NOMES CORRETOS das colunas
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_approved_inscricao_to_credenciado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credenciado_id UUID;
  v_dados JSONB;
  v_nome TEXT;
  v_cpf TEXT;
  v_pessoa_tipo TEXT;
BEGIN
  -- Só executar quando status muda para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD IS NULL OR OLD.status != 'aprovado') THEN
    
    RAISE NOTICE '[SYNC_CREDENCIADO] Iniciando sync para inscrição %', NEW.id;
    
    -- Obter dados da inscrição
    v_dados := NEW.dados_inscricao;
    
    -- Validação de dados mínimos
    IF v_dados IS NULL THEN
      INSERT INTO workflow_messages (
        inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
      ) VALUES (
        NEW.id, 'sistema',
        '⚠️ Dados de inscrição ausentes. Credenciado não foi criado automaticamente.',
        'alerta', ARRAY['analista', 'gestor'],
        jsonb_build_object('error', 'dados_inscricao_null', 'timestamp', NOW())
      );
      RETURN NEW;
    END IF;
    
    -- Verificar se credenciado já existe
    SELECT id INTO v_credenciado_id
    FROM credenciados
    WHERE inscricao_id = NEW.id;
    
    IF v_credenciado_id IS NOT NULL THEN
      RAISE NOTICE '[SYNC_CREDENCIADO] Credenciado já existe: %', v_credenciado_id;
      RETURN NEW;
    END IF;
    
    -- Determinar tipo de pessoa e extrair dados
    IF v_dados->'dadosPessoais' IS NOT NULL THEN
      v_pessoa_tipo := 'PF';
      v_nome := v_dados->'dadosPessoais'->>'nome';
      v_cpf := v_dados->'dadosPessoais'->>'cpf';
    ELSIF v_dados->'dadosPJ' IS NOT NULL THEN
      v_pessoa_tipo := 'PJ';
      v_nome := v_dados->'dadosPJ'->>'razao_social';
      v_cpf := v_dados->'dadosPJ'->>'cnpj';
    ELSE
      INSERT INTO workflow_messages (
        inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
      ) VALUES (
        NEW.id, 'sistema',
        '⚠️ Dados pessoais/PJ ausentes. Credenciado não foi criado.',
        'alerta', ARRAY['analista', 'gestor'],
        jsonb_build_object('error', 'missing_dados', 'timestamp', NOW())
      );
      RETURN NEW;
    END IF;
    
    -- Validar dados obrigatórios
    IF v_nome IS NULL OR v_cpf IS NULL THEN
      INSERT INTO workflow_messages (
        inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
      ) VALUES (
        NEW.id, 'sistema',
        '⚠️ Nome ou CPF ausente. Credenciado não foi criado.',
        'alerta', ARRAY['analista', 'gestor'],
        jsonb_build_object('error', 'missing_required_fields', 'timestamp', NOW())
      );
      RETURN NEW;
    END IF;
    
    -- Criar credenciado
    BEGIN
      INSERT INTO credenciados (
        inscricao_id,
        nome,
        cpf,
        email,
        telefone,
        celular,
        data_nascimento,
        endereco,
        cidade,
        estado,
        cep,
        status,
        pessoa_tipo
      )
      VALUES (
        NEW.id,
        v_nome,
        v_cpf,
        COALESCE(v_dados->'dadosPessoais'->>'email', v_dados->'dadosPJ'->>'email'),
        COALESCE(v_dados->'dadosPessoais'->>'telefone', v_dados->'dadosPJ'->>'telefone'),
        COALESCE(v_dados->'dadosPessoais'->>'celular', v_dados->'dadosPJ'->>'celular'),
        CASE 
          WHEN v_dados->'dadosPessoais'->>'data_nascimento' IS NOT NULL 
          THEN (v_dados->'dadosPessoais'->>'data_nascimento')::DATE
          ELSE NULL
        END,
        COALESCE(
          v_dados->'endereco_correspondencia'->>'logradouro',
          v_dados->'dadosPessoais'->'endereco'->>'logradouro'
        ),
        COALESCE(
          v_dados->'endereco_correspondencia'->>'cidade',
          v_dados->'dadosPessoais'->'endereco'->>'cidade'
        ),
        COALESCE(
          v_dados->'endereco_correspondencia'->>'uf',
          v_dados->'dadosPessoais'->'endereco'->>'uf'
        ),
        COALESCE(
          v_dados->'endereco_correspondencia'->>'cep',
          v_dados->'dadosPessoais'->'endereco'->>'cep'
        ),
        'Ativo',
        v_pessoa_tipo
      )
      RETURNING id INTO v_credenciado_id;
      
      RAISE NOTICE '[SYNC_CREDENCIADO] ✅ Credenciado criado: %', v_credenciado_id;
      
      -- Mensagem de sucesso
      INSERT INTO workflow_messages (
        inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
      ) VALUES (
        NEW.id, 'sistema',
        '✅ Credenciado criado automaticamente com sucesso.',
        'info', ARRAY['analista', 'gestor'],
        jsonb_build_object('credenciado_id', v_credenciado_id, 'timestamp', NOW())
      );
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[SYNC_CREDENCIADO] ❌ Erro ao criar credenciado: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
        
        -- Mensagem de erro (usando NOMES CORRETOS das colunas)
        INSERT INTO workflow_messages (
          inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
        ) VALUES (
          NEW.id, 'sistema',
          format('⚠️ Erro ao criar credenciado: %s', SQLERRM),
          'alerta', ARRAY['analista', 'gestor'],
          jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE, 'timestamp', NOW())
        );
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Recriar trigger
-- ============================================================================
CREATE TRIGGER trg_sync_approved_to_credenciado
  AFTER UPDATE OF status ON inscricoes_edital
  FOR EACH ROW
  WHEN (NEW.status = 'aprovado' AND OLD.status IS DISTINCT FROM 'aprovado')
  EXECUTE FUNCTION sync_approved_inscricao_to_credenciado();

-- ============================================================================
-- Verificação final
-- ============================================================================
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_trigger_exists BOOLEAN;
BEGIN
  -- Verificar se função existe
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'sync_approved_inscricao_to_credenciado'
  ) INTO v_function_exists;
  
  -- Verificar se trigger existe
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_sync_approved_to_credenciado'
  ) INTO v_trigger_exists;
  
  IF v_function_exists AND v_trigger_exists THEN
    RAISE NOTICE '✅ Função e trigger recriados com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Verificar: função=%, trigger=%', v_function_exists, v_trigger_exists;
  END IF;
END $$;