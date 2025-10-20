-- Configurar app.settings com URL do Supabase
-- Isso resolve o erro "unrecognized configuration parameter app.settings.supabase_url"

DO $$
BEGIN
  -- Configurar o parâmetro app.settings se não existir
  EXECUTE 'ALTER DATABASE postgres SET app.settings TO ''{"supabase_url": "https://ncmofeencqpqhtguxmvy.supabase.co", "service_role_key": ""}''';
EXCEPTION
  WHEN OTHERS THEN
    -- Se der erro, apenas loga
    RAISE NOTICE 'Não foi possível configurar app.settings: %', SQLERRM;
END;
$$;