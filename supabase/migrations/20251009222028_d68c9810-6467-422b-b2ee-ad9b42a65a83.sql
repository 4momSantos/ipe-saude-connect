-- Cron Job para Alertas de Prazo de Assinatura
-- Executa diariamente às 9h para verificar assinaturas pendentes

SELECT cron.schedule(
  'check-signature-deadlines',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ncmofeencqpqhtguxmvy.supabase.co/functions/v1/check-signature-deadlines',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings', true)::json->>'service_role_key'
    )
  ) as request_id;
  $$
);