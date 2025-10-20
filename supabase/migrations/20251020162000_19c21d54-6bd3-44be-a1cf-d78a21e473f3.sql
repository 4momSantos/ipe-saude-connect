-- SOLUÇÃO 2: Adicionar suporte a OCR em documentos_credenciados

-- Adicionar colunas de OCR
ALTER TABLE public.documentos_credenciados 
ADD COLUMN IF NOT EXISTS ocr_processado boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ocr_resultado jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ocr_confidence numeric(5,2) DEFAULT NULL;

-- Criar índice GIN para busca em OCR
CREATE INDEX IF NOT EXISTS idx_documentos_credenciados_ocr_resultado 
ON public.documentos_credenciados USING GIN (ocr_resultado);

-- Criar função para processar OCR automaticamente
CREATE OR REPLACE FUNCTION public.trigger_ocr_documento_credenciado()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o arquivo foi atualizado e é um PDF, marcar para processamento OCR
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.url_arquivo IS DISTINCT FROM OLD.url_arquivo)) 
     AND NEW.url_arquivo IS NOT NULL 
     AND NEW.url_arquivo ILIKE '%.pdf' THEN
    
    -- Marcar como não processado
    NEW.ocr_processado := false;
    NEW.ocr_resultado := NULL;
    NEW.ocr_confidence := NULL;
    
    -- Chamar edge function para processar OCR (assíncrono via pg_net)
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-process-ocr-document',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
      ),
      body := jsonb_build_object(
        'documento_id', NEW.id,
        'documento_tipo', 'documento_credenciado'
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_ocr_documento_credenciado ON public.documentos_credenciados;
CREATE TRIGGER trigger_ocr_documento_credenciado
  BEFORE INSERT OR UPDATE OF url_arquivo
  ON public.documentos_credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ocr_documento_credenciado();

-- Marcar PDFs existentes para reprocessamento
UPDATE public.documentos_credenciados
SET ocr_processado = false
WHERE url_arquivo ILIKE '%.pdf' 
  AND (ocr_processado IS NULL OR ocr_processado = true)
  AND is_current = true;