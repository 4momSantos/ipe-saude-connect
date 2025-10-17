-- ✅ FASE 4: Geocodificação automática de credenciados

-- Função para geocodificar credenciados automaticamente via edge function
CREATE OR REPLACE FUNCTION public.trigger_geocodificar_credenciado()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_endereco_completo TEXT;
BEGIN
  -- Só geocodificar se:
  -- 1. Credenciado está Ativo
  -- 2. Tem endereço preenchido
  -- 3. Ainda não foi geocodificado
  IF NEW.status = 'Ativo' AND 
     (NEW.endereco IS NOT NULL OR NEW.cep IS NOT NULL) AND 
     NEW.latitude IS NULL THEN
    
    RAISE NOTICE '[GEOCODE_AUTO] Iniciando geocodificação para credenciado %', NEW.id;
    
    -- Obter URL do Supabase (usando configurações do projeto)
    v_supabase_url := current_setting('app.settings', true)::json->>'supabase_url';
    v_service_role_key := current_setting('app.settings', true)::json->>'service_role_key';
    
    -- Fallback para URL padrão se não conseguir obter
    IF v_supabase_url IS NULL THEN
      v_supabase_url := 'https://ncmofeencqpqhtguxmvy.supabase.co';
    END IF;
    
    -- Chamar edge function de geocodificação assíncrona via pg_net
    BEGIN
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/geocodificar-credenciado',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(v_service_role_key, '')
        ),
        body := jsonb_build_object(
          'credenciado_id', NEW.id::text
        ),
        timeout_milliseconds := 30000
      );
      
      RAISE NOTICE '[GEOCODE_AUTO] ✅ Requisição de geocodificação enviada para credenciado %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      -- Se houver erro na requisição HTTP, apenas loga mas não falha a operação
      RAISE WARNING '[GEOCODE_AUTO] ⚠️ Erro ao requisitar geocodificação: %', SQLERRM;
    END;
  ELSIF NEW.status = 'Ativo' AND NEW.latitude IS NOT NULL THEN
    RAISE NOTICE '[GEOCODE_AUTO] Credenciado % já possui coordenadas, pulando geocodificação', NEW.id;
  ELSIF NEW.status != 'Ativo' THEN
    RAISE NOTICE '[GEOCODE_AUTO] Credenciado % não está Ativo, pulando geocodificação', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Criar trigger para geocodificar credenciados automaticamente
DROP TRIGGER IF EXISTS trigger_geocodificar_credenciado_auto ON public.credenciados;

CREATE TRIGGER trigger_geocodificar_credenciado_auto
  AFTER INSERT OR UPDATE OF status, endereco, cep, cidade, estado
  ON public.credenciados
  FOR EACH ROW
  WHEN (NEW.status = 'Ativo' AND NEW.latitude IS NULL)
  EXECUTE FUNCTION public.trigger_geocodificar_credenciado();

COMMENT ON TRIGGER trigger_geocodificar_credenciado_auto ON public.credenciados IS 
'Geocodifica automaticamente credenciados ativos que ainda não possuem coordenadas';

-- Criar índice para melhorar performance de queries de credenciados não geocodificados
CREATE INDEX IF NOT EXISTS idx_credenciados_pendentes_geocode 
  ON public.credenciados (status, latitude) 
  WHERE status = 'Ativo' AND latitude IS NULL;

COMMENT ON INDEX idx_credenciados_pendentes_geocode IS 
'Índice para encontrar rapidamente credenciados ativos que precisam de geocodificação';