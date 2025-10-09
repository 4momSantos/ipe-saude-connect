-- Habilitar extensão pg_net se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função trigger para gerar contrato após credenciamento
CREATE OR REPLACE FUNCTION trigger_gerar_contrato_pos_credenciamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inscricao_id UUID;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Só executa se status mudou para 'Ativo'
  IF NEW.status = 'Ativo' AND (OLD IS NULL OR OLD.status != 'Ativo') THEN
    
    v_inscricao_id := NEW.inscricao_id;
    
    IF v_inscricao_id IS NOT NULL THEN
      -- Obter configurações do ambiente
      v_supabase_url := current_setting('app.settings', true)::json->>'api_url';
      v_service_role_key := current_setting('app.settings', true)::json->>'service_role_key';
      
      -- Chamar edge function de forma assíncrona via pg_net
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/gerar-contrato-assinatura',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object(
          'inscricao_id', v_inscricao_id
        )
      );
      
      RAISE NOTICE '[AUTO_CONTRATO] Contrato requisitado para credenciado % (inscricao %)', NEW.id, v_inscricao_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS auto_gerar_contrato_apos_credenciamento ON credenciados;

CREATE TRIGGER auto_gerar_contrato_apos_credenciamento
AFTER INSERT OR UPDATE ON credenciados
FOR EACH ROW
EXECUTE FUNCTION trigger_gerar_contrato_pos_credenciamento();