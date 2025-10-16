-- Criar extensão pg_cron se não existir
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Configurar cron job para gerar PDFs automaticamente a cada hora
SELECT cron.schedule(
  'auto-generate-certificate-pdfs',
  '0 * * * *', -- A cada hora
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/generate-missing-pdfs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Criar trigger para gerar PDF automaticamente quando certificado é emitido
CREATE OR REPLACE FUNCTION trigger_gerar_pdf_certificado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só executa se não tem PDF ainda
  IF NEW.url_pdf IS NULL AND NEW.ativo = true AND NEW.cancelado = false THEN
    -- Chamar edge function de forma assíncrona
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/gerar-certificado-regularidade',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
      ),
      body := jsonb_build_object('certificadoId', NEW.id)
    );
    
    RAISE NOTICE '[AUTO_PDF] PDF solicitado para certificado %', NEW.numero_certificado;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '[AUTO_PDF] Erro ao solicitar geração de PDF: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS on_certificado_regularidade_insert ON certificados_regularidade;
CREATE TRIGGER on_certificado_regularidade_insert
  AFTER INSERT ON certificados_regularidade
  FOR EACH ROW
  EXECUTE FUNCTION trigger_gerar_pdf_certificado();

-- Comentários
COMMENT ON FUNCTION trigger_gerar_pdf_certificado() IS 'Gera PDF automaticamente quando um certificado de regularidade é emitido';
