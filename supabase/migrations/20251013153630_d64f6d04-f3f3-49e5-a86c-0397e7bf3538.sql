-- Fix trigger to use correct Supabase environment variables
CREATE OR REPLACE FUNCTION public.trigger_gerar_contrato_pos_credenciamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_inscricao_id UUID;
BEGIN
  -- Só executa se status mudou para 'Ativo'
  IF NEW.status = 'Ativo' AND (OLD IS NULL OR OLD.status != 'Ativo') THEN
    
    v_inscricao_id := NEW.inscricao_id;
    
    IF v_inscricao_id IS NOT NULL THEN
      -- Chamar edge function de forma assíncrona via pg_net
      -- Usando variáveis de ambiente do Supabase
      PERFORM net.http_post(
        url := current_setting('request.headers')::json->>'x-forwarded-host' || '/functions/v1/gerar-contrato-assinatura',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', current_setting('request.headers')::json->>'authorization'
        ),
        body := jsonb_build_object(
          'inscricao_id', v_inscricao_id
        )
      );
      
      RAISE NOTICE '[AUTO_CONTRATO] Contrato requisitado para credenciado % (inscricao %)', NEW.id, v_inscricao_id;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se houver erro na requisição HTTP, apenas loga mas não falha a operação
    RAISE WARNING '[AUTO_CONTRATO] Erro ao requisitar contrato: %', SQLERRM;
    RETURN NEW;
END;
$function$;