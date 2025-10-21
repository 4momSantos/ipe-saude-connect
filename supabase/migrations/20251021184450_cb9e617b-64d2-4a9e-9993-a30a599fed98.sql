-- Corrigir função sync_approved_inscricao_to_credenciado que usa colunas incorretas
-- A tabela workflow_messages tem 'tipo' e 'manifestacao_metadata', não 'tipo_manifestacao' e 'metadata'

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
  v_rg TEXT;
  v_email TEXT;
  v_telefone TEXT;
  v_celular TEXT;
  v_data_nascimento DATE;
  v_tipo_credenciamento TEXT;
  v_endereco TEXT;
  v_bairro TEXT;
  v_cidade TEXT;
  v_estado TEXT;
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    RAISE NOTICE '[CREDENCIADO_SYNC] 🔄 Inscrição % aprovada, iniciando sync', NEW.id;
    
    BEGIN
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
      
      v_tipo_credenciamento := NEW.tipo_credenciamento;
      
      IF v_tipo_credenciamento IS NULL THEN
        v_tipo_credenciamento := CASE 
          WHEN v_dados->'dadosPessoais' IS NOT NULL THEN 'PF'
          WHEN v_dados->'dadosPJ' IS NOT NULL THEN 'PJ'
          ELSE 'PF'
        END;
      END IF;
      
      IF v_tipo_credenciamento = 'PF' THEN
        v_nome := v_dados->'dadosPessoais'->>'nomeCompleto';
        v_cpf := v_dados->'dadosPessoais'->>'cpf';
        v_rg := v_dados->'dadosPessoais'->>'rg';
        v_email := v_dados->'dadosPessoais'->>'email';
        v_telefone := v_dados->'dadosPessoais'->>'telefone';
        v_celular := v_dados->'dadosPessoais'->>'celular';
        v_data_nascimento := (v_dados->'dadosPessoais'->>'dataNascimento')::date;
      ELSE
        v_nome := v_dados->'dadosPJ'->>'razaoSocial';
        v_cpf := v_dados->'dadosPJ'->>'cnpj';
        v_email := v_dados->'dadosPJ'->>'email';
        v_telefone := v_dados->'dadosPJ'->>'telefone';
      END IF;
      
      v_endereco := v_dados->'endereco'->>'logradouro';
      v_bairro := v_dados->'endereco'->>'bairro';
      v_cidade := v_dados->'endereco'->>'cidade';
      v_estado := v_dados->'endereco'->>'estado';
      
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
      
      SELECT id INTO v_credenciado_id
      FROM credenciados
      WHERE inscricao_id = NEW.id;
      
      IF v_credenciado_id IS NULL THEN
        INSERT INTO public.credenciados (
          inscricao_id,
          tipo_credenciamento,
          nome,
          cpf,
          rg,
          email,
          telefone,
          celular,
          data_nascimento,
          endereco,
          bairro,
          cidade,
          estado,
          status
        )
        VALUES (
          NEW.id,
          v_tipo_credenciamento,
          v_nome,
          v_cpf,
          v_rg,
          v_email,
          v_telefone,
          v_celular,
          v_data_nascimento,
          v_endereco,
          v_bairro,
          v_cidade,
          v_estado,
          'Ativo'
        )
        RETURNING id INTO v_credenciado_id;
        
        RAISE NOTICE '[CREDENCIADO_SYNC] ✅ Credenciado % criado para inscrição %', v_credenciado_id, NEW.id;
      ELSE
        UPDATE public.credenciados
        SET
          nome = v_nome,
          cpf = v_cpf,
          rg = v_rg,
          email = v_email,
          telefone = v_telefone,
          celular = v_celular,
          data_nascimento = v_data_nascimento,
          endereco = v_endereco,
          bairro = v_bairro,
          cidade = v_cidade,
          estado = v_estado,
          status = 'Ativo',
          updated_at = NOW()
        WHERE id = v_credenciado_id;
        
        RAISE NOTICE '[CREDENCIADO_SYNC] ✅ Credenciado % atualizado', v_credenciado_id;
      END IF;
      
      PERFORM log_audit_event(
        'credenciado_created_from_approval',
        'credenciado',
        v_credenciado_id,
        NULL,
        jsonb_build_object(
          'inscricao_id', NEW.id,
          'origem', 'aprovacao_automatica',
          'tipo_credenciamento', v_tipo_credenciamento
        ),
        NEW.analisado_por
      );
      
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
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recriar trigger
CREATE TRIGGER trg_sync_approved_inscricao_to_credenciado
  AFTER UPDATE OF status ON inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION sync_approved_inscricao_to_credenciado();