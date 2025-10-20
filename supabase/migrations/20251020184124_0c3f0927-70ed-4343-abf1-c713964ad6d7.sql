-- Corrigir trigger de OCR para não depender de app.settings
-- e não falhar quando processar documentos migrados

CREATE OR REPLACE FUNCTION public.trigger_ocr_documento_credenciado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_supabase_url TEXT;
  v_supabase_key TEXT;
BEGIN
  -- Se o arquivo foi atualizado e é um PDF, marcar para processamento OCR
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.url_arquivo IS DISTINCT FROM OLD.url_arquivo)) 
     AND NEW.url_arquivo IS NOT NULL 
     AND NEW.url_arquivo ILIKE '%.pdf' THEN
    
    -- Marcar como não processado
    NEW.ocr_processado := false;
    NEW.ocr_resultado := NULL;
    NEW.ocr_confidence := NULL;
    
    -- Tentar obter configurações de forma segura
    BEGIN
      v_supabase_url := current_setting('app.settings', true)::json->>'supabase_url';
      v_supabase_key := current_setting('app.settings', true)::json->>'supabase_anon_key';
      
      -- Se não conseguiu pegar das settings, usar valores padrão
      IF v_supabase_url IS NULL THEN
        v_supabase_url := 'https://ncmofeencqpqhtguxmvy.supabase.co';
      END IF;
      
      -- Só tentar chamar edge function se tiver as configurações
      IF v_supabase_url IS NOT NULL THEN
        PERFORM net.http_post(
          url := v_supabase_url || '/functions/v1/auto-process-ocr-document',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', CASE 
              WHEN v_supabase_key IS NOT NULL THEN 'Bearer ' || v_supabase_key
              ELSE ''
            END
          ),
          body := jsonb_build_object(
            'documento_id', NEW.id,
            'documento_tipo', 'documento_credenciado'
          )
        );
        
        RAISE NOTICE '[OCR_AUTO] OCR requisitado para documento %', NEW.id;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Se falhar ao chamar edge function, apenas loga mas não impede a operação
      RAISE WARNING '[OCR_AUTO] Não foi possível processar OCR automaticamente: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$;