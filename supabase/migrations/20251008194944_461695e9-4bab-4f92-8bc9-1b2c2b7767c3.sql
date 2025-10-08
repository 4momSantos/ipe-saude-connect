-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar job cron para processar schedules a cada minuto
SELECT cron.schedule(
  'process-workflow-schedules',
  '* * * * *', -- A cada minuto
  $$
  SELECT
    net.http_post(
      url := 'https://ncmofeencqpqhtguxmvy.supabase.co/functions/v1/schedule-trigger',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('timestamp', now())
    ) as request_id;
  $$
);