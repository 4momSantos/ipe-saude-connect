-- ============================================
-- CORREÇÃO DE INSCRIÇÕES ÓRFÃS (V3)
-- ============================================

-- Desabilitar triggers que podem causar cascatas indesejadas
ALTER TABLE workflow_executions DISABLE TRIGGER trigger_sync_workflow_status;
ALTER TABLE inscricoes_edital DISABLE TRIGGER trigger_sync_approved_to_credenciado;
ALTER TABLE inscricoes_edital DISABLE TRIGGER create_analise_on_inscricao_trigger;
ALTER TABLE inscricoes_edital DISABLE TRIGGER trigger_create_analise_on_inscricao;

-- 1. Marcar workflows órfãos como completed (SEM FILTRO DE TEMPO)
UPDATE workflow_executions 
SET 
  status = 'completed',
  completed_at = NOW(),
  current_node_id = NULL,
  error_message = 'Migrado para fluxo programático'
WHERE status = 'running' 
  AND current_node_id IS NULL;

-- 2. Limpar workflow_execution_id das inscrições órfãs
UPDATE inscricoes_edital 
SET 
  workflow_execution_id = NULL,
  updated_at = NOW()
WHERE status = 'em_analise'
  AND workflow_execution_id IN (
    SELECT id FROM workflow_executions 
    WHERE status = 'completed' 
      AND error_message = 'Migrado para fluxo programático'
  );

-- 3. Criar análises para inscrições órfãs
INSERT INTO analises (inscricao_id, status, created_at)
SELECT 
  id,
  'pendente'::TEXT,
  NOW()
FROM inscricoes_edital
WHERE status = 'em_analise'
  AND workflow_execution_id IS NULL
ON CONFLICT (inscricao_id) DO NOTHING;

-- 4. Migrar status para aguardando_analise
UPDATE inscricoes_edital 
SET 
  status = 'aguardando_analise',
  updated_at = NOW()
WHERE status = 'em_analise'
  AND workflow_execution_id IS NULL;

-- Reabilitar triggers
ALTER TABLE workflow_executions ENABLE TRIGGER trigger_sync_workflow_status;
ALTER TABLE inscricoes_edital ENABLE TRIGGER trigger_sync_approved_to_credenciado;
ALTER TABLE inscricoes_edital ENABLE TRIGGER create_analise_on_inscricao_trigger;
ALTER TABLE inscricoes_edital ENABLE TRIGGER trigger_create_analise_on_inscricao;