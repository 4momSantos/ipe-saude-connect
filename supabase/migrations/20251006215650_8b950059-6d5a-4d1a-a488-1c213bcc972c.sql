-- Sprint 3: Ativar Worker com pg_cron e índices otimizados

-- Habilitar extensão pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensão pg_net para HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar job para processar fila a cada 2 minutos
SELECT cron.schedule(
  'process-workflow-queue-job',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ncmofeencqpqhtguxmvy.supabase.co/functions/v1/process-workflow-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jbW9mZWVuY3FwcWh0Z3V4bXZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTIwMjIsImV4cCI6MjA3NDk2ODAyMn0.44HsDWZDQ_lkDV6ypiH_dEjebxbV-Ce2iTOTpVvkW0M"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Adicionar índice para otimizar consultas na fila
CREATE INDEX IF NOT EXISTS idx_workflow_queue_status_created 
ON workflow_queue(status, created_at) 
WHERE status IN ('pending', 'failed');

-- Índice adicional para execuções ativas
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status_started
ON workflow_executions(status, started_at)
WHERE status = 'running';

-- Adicionar coluna de feature flag nos editais
ALTER TABLE editais 
ADD COLUMN IF NOT EXISTS use_orchestrator_v2 BOOLEAN DEFAULT false;

-- Comentários
COMMENT ON INDEX idx_workflow_queue_status_created IS 'Otimiza consultas de workflows pendentes/falhados ordenados por data';
COMMENT ON INDEX idx_workflow_executions_status_started IS 'Otimiza consultas de workflows em execução para monitoramento';
COMMENT ON COLUMN editais.use_orchestrator_v2 IS 'Flag para usar execute-workflow-v2 (orquestrador cognitivo)';