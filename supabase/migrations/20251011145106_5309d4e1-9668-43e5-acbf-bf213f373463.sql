-- Função para trigger de OCR automático
CREATE OR REPLACE FUNCTION public.auto_trigger_ocr_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_ocr_config JSONB;
BEGIN
  -- Só processar se:
  -- 1. OCR não foi processado ainda (ocr_processado = false)
  -- 2. Tipo de documento suporta OCR
  
  IF NEW.ocr_processado = false AND NEW.tipo_documento IN (
    'identidade_medica', 'rg_cpf', 'cnpj', 'cpf', 'rg', 'cnh', 
    'diploma', 'certidao', 'comprovante_endereco'
  ) THEN
    
    -- Buscar configuração OCR do edital (se existir)
    SELECT e.uploads_config->NEW.tipo_documento->'ocrConfig'
    INTO v_ocr_config
    FROM inscricao_documentos id
    JOIN inscricoes_edital ie ON ie.id = id.inscricao_id
    JOIN editais e ON e.id = ie.edital_id
    WHERE id.id = NEW.id;
    
    -- Se OCR está habilitado na config do edital (ou se não há config, processar por padrão)
    IF v_ocr_config IS NULL OR (v_ocr_config->>'enabled')::BOOLEAN = true THEN
      
      -- Obter configurações
      v_supabase_url := current_setting('app.settings', true)::json->>'api_url';
      v_service_role_key := current_setting('app.settings', true)::json->>'service_role_key';
      
      -- Chamar edge function de forma assíncrona
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/auto-process-ocr-document',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_service_role_key
        ),
        body := jsonb_build_object(
          'documento_id', NEW.id
        )
      );
      
      RAISE NOTICE '[AUTO_OCR] OCR enfileirado para documento % (tipo: %)', NEW.id, NEW.tipo_documento;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_auto_process_ocr ON public.inscricao_documentos;
CREATE TRIGGER trigger_auto_process_ocr
AFTER INSERT ON public.inscricao_documentos
FOR EACH ROW
WHEN (NEW.ocr_processado = false)
EXECUTE FUNCTION public.auto_trigger_ocr_processing();