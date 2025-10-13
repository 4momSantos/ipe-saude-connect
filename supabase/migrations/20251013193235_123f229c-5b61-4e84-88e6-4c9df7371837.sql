-- ============================================
-- ATIVAÇÃO DO FLUXO PROGRAMÁTICO (CORRIGIDO)
-- ============================================

-- 1. Ativar fluxo programático nos editais publicados/abertos
UPDATE editais 
SET 
  use_programmatic_flow = true,
  workflow_id = NULL,
  workflow_version = NULL,
  updated_at = NOW()
WHERE status IN ('aberto', 'publicado')
  AND use_programmatic_flow = false;

-- 2. Marcar workflows órfãos como failed (status válido)
UPDATE workflow_executions 
SET 
  status = 'failed', 
  completed_at = NOW(),
  error_message = 'Cancelado: migração para fluxo programático'
WHERE status = 'running' 
  AND started_at < NOW() - INTERVAL '1 day';

-- 3. Resetar inscrições travadas para reprocessamento programático
UPDATE inscricoes_edital 
SET 
  status = 'aguardando_analise',
  updated_at = NOW()
WHERE status = 'em_analise'
  AND workflow_execution_id IN (
    SELECT id FROM workflow_executions WHERE status = 'failed' AND completed_at > NOW() - INTERVAL '5 minutes'
  );