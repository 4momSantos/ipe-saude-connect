-- Correção DEFINITIVA do trigger sync_approved_inscricao_to_credenciado
-- Trocar TODAS as ocorrências de tipo_manifestacao → tipo e metadata → manifestacao_metadata

DROP FUNCTION IF EXISTS public.sync_approved_inscricao_to_credenciado() CASCADE;

CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_credenciado_id UUID;
  v_dados JSONB;
  v_nome TEXT;
  v_cpf TEXT;
  v_pessoa_tipo TEXT;
BEGIN
  -- Só executar quando status muda para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD IS NULL OR OLD.status != 'aprovado') THEN
    RAISE NOTICE '[CREDENCIADO_SYNC] 🟢 Inscrição % aprovada, iniciando criação automática de credenciado', NEW.id;
    
    -- Obter dados da inscrição
    v_dados := NEW.dados_inscricao;
    
    -- Validação robusta dos dados
    IF v_dados IS NULL THEN
      RAISE WARNING '[CREDENCIADO_SYNC] Inscrição % aprovada mas dados_inscricao é NULL', NEW.id;
      
      INSERT INTO public.workflow_messages (
        inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
      ) VALUES (
        NEW.id, 'sistema',
        '⚠️ **ERRO**: Dados de inscrição ausentes. Não foi possível criar credenciado automaticamente.',
        'alerta', ARRAY['analista', 'gestor'],
        jsonb_build_object('error', 'dados_inscricao is NULL')
      );
      
      RETURN NEW;
    END IF;
    
    IF v_dados->'dadosPessoais' IS NULL AND v_dados->'dadosPJ' IS NULL THEN
      RAISE WARNING '[CREDENCIADO_SYNC] Inscrição % sem dadosPessoais ou dadosPJ', NEW.id;
      
      INSERT INTO public.workflow_messages (
        inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
      ) VALUES (
        NEW.id, 'sistema',
        '⚠️ **ERRO**: Dados pessoais/PJ ausentes. Verifique o cadastro da inscrição.',
        'alerta', ARRAY['analista', 'gestor'],
        jsonb_build_object('error', 'missing dadosPessoais and dadosPJ')
      );
      
      RETURN NEW;
    END IF;
    
    -- Verificar se já existe um credenciado para esta inscrição
    SELECT id INTO v_credenciado_id
    FROM public.credenciados
    WHERE inscricao_id = NEW.id;
    
    IF v_credenciado_id IS NOT NULL THEN
      RAISE NOTICE '[CREDENCIADO_SYNC] ✅ Credenciado % já existe para inscrição %', v_credenciado_id, NEW.id;
      RETURN NEW;
    END IF;
    
    -- Determinar tipo de pessoa (PF ou PJ)
    IF v_dados->'dadosPessoais' IS NOT NULL THEN
      v_pessoa_tipo := 'PF';
      v_nome := v_dados->'dadosPessoais'->>'nome';
      v_cpf := v_dados->'dadosPessoais'->>'cpf';
    ELSIF v_dados->'dadosPJ' IS NOT NULL THEN
      v_pessoa_tipo := 'PJ';
      v_nome := v_dados->'dadosPJ'->>'razao_social';
      v_cpf := v_dados->'dadosPJ'->>'cnpj';
    END IF;
    
    -- Validar dados mínimos
    IF v_nome IS NULL OR v_cpf IS NULL THEN
      RAISE WARNING '[CREDENCIADO_SYNC] Dados mínimos ausentes (nome ou CPF)';
      
      INSERT INTO public.workflow_messages (
        inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
      ) VALUES (
        NEW.id, 'sistema',
        '⚠️ **ERRO**: Nome ou CPF ausente. Não foi possível criar credenciado.',
        'alerta', ARRAY['analista', 'gestor'],
        jsonb_build_object('error', 'missing nome or cpf')
      );
      
      RETURN NEW;
    END IF;
    
    -- Criar credenciado
    BEGIN
      INSERT INTO public.credenciados (
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
          THEN (v_dados->'dadosPessoais'->>'data_nascimento')::date
          ELSE NULL
        END,
        COALESCE(
          v_dados->'endereco_correspondencia'->>'logradouro',
          v_dados->'dadosPessoais'->'endereco'->>'logradouro',
          v_dados->'dadosPJ'->'endereco'->>'logradouro'
        ),
        COALESCE(
          v_dados->'endereco_correspondencia'->>'cidade',
          v_dados->'dadosPessoais'->'endereco'->>'cidade',
          v_dados->'dadosPJ'->'endereco'->>'cidade'
        ),
        COALESCE(
          v_dados->'endereco_correspondencia'->>'uf',
          v_dados->'dadosPessoais'->'endereco'->>'uf',
          v_dados->'dadosPJ'->'endereco'->>'uf'
        ),
        COALESCE(
          v_dados->'endereco_correspondencia'->>'cep',
          v_dados->'dadosPessoais'->'endereco'->>'cep',
          v_dados->'dadosPJ'->'endereco'->>'cep'
        ),
        'Ativo',
        v_pessoa_tipo
      )
      RETURNING id INTO v_credenciado_id;
      
      RAISE NOTICE '[CREDENCIADO_SYNC] ✅ Credenciado % criado com sucesso para inscrição %', v_credenciado_id, NEW.id;
      
      -- Log de auditoria
      PERFORM public.log_audit_event(
        'credenciado_created',
        'credenciado',
        v_credenciado_id,
        NULL,
        jsonb_build_object(
          'inscricao_id', NEW.id,
          'nome', v_nome,
          'cpf', v_cpf,
          'tipo_pessoa', v_pessoa_tipo,
          'created_by_trigger', true
        ),
        NEW.analisado_por
      );
      
      -- Criar mensagem informando sucesso
      INSERT INTO public.workflow_messages (
        inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
      ) VALUES (
        NEW.id, 'sistema',
        '✅ Credenciado criado com sucesso. Os documentos serão migrados automaticamente em breve.',
        'info', ARRAY['analista', 'gestor'],
        jsonb_build_object('credenciado_id', v_credenciado_id, 'action', 'pending_document_migration')
      );
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '[CREDENCIADO_SYNC] ❌ Erro ao criar credenciado: % - %', SQLERRM, SQLSTATE;
        
        INSERT INTO public.workflow_messages (
          inscricao_id, sender_type, content, tipo, visivel_para, manifestacao_metadata
        ) VALUES (
          NEW.id, 'sistema',
          format('⚠️ **ERRO CRÍTICO**: Falha ao criar credenciado automaticamente. Erro técnico: %s', SQLERRM),
          'alerta', ARRAY['analista', 'gestor'],
          jsonb_build_object('error', SQLERRM, 'sqlstate', SQLSTATE, 'timestamp', NOW())
        );
        
        RETURN NEW;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar o trigger
DROP TRIGGER IF EXISTS trg_auto_create_credenciado ON public.inscricoes_edital;

CREATE TRIGGER trg_auto_create_credenciado
  AFTER UPDATE OF status ON public.inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_approved_inscricao_to_credenciado();