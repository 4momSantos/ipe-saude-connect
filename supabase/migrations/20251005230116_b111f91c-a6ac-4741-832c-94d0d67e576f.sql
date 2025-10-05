
-- FASE 6-10: Configurar Cron Job para Processar Fila Automaticamente (CORRIGIDO)
-- ============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Criar cron job para processar fila a cada 2 minutos
SELECT cron.schedule(
  'process-workflow-queue-job',
  '*/2 * * * *', -- A cada 2 minutos
  $$
  SELECT
    net.http_post(
        url:='https://ncmofeencqpqhtguxmvy.supabase.co/functions/v1/process-workflow-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbW9mZWVuY3FwcWh0Z3V4bXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTIwMjIsImV4cCI6MjA3NDk2ODAyMn0.44HsDWZDQ_lkDV6ypiH_dEjebxbV-Ce2iTOTpVvkW0M"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Comentário
COMMENT ON EXTENSION pg_cron IS 'Agendador de tarefas periódicas para processar fila de workflows automaticamente';
