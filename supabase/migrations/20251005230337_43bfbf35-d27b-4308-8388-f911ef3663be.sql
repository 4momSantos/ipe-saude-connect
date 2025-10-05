
-- FASE 1-5: Limpeza e Normalização de Dados + Performance

-- 1. Limpar execuções órfãs (sem inscrição associada e antigas)
DELETE FROM workflow_executions
WHERE id IN (
  SELECT we.id 
  FROM workflow_executions we
  LEFT JOIN inscricoes_edital ie ON ie.workflow_execution_id = we.id
  WHERE ie.id IS NULL
    AND we.started_at < NOW() - INTERVAL '24 hours'
);

-- 2. Resetar itens da fila com erro para retry
UPDATE workflow_queue
SET 
  status = 'pending',
  attempts = 0,
  processing_started_at = NULL,
  error_message = NULL
WHERE status IN ('failed', 'pending')
  AND attempts < max_attempts;

-- 3. Re-enfileirar inscrições órfãs
INSERT INTO workflow_queue (
  inscricao_id,
  workflow_id,
  workflow_version,
  input_data,
  status,
  attempts
)
SELECT 
  ie.id,
  e.workflow_id,
  e.workflow_version,
  jsonb_build_object(
    'inscricaoId', ie.id,
    'candidatoId', ie.candidato_id,
    'editalId', ie.edital_id,
    'dadosInscricao', ie.dados_inscricao
  ),
  'pending'::TEXT,
  0
FROM inscricoes_edital ie
JOIN editais e ON e.id = ie.edital_id
WHERE ie.workflow_execution_id IS NULL
  AND ie.is_rascunho = false
  AND e.workflow_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM workflow_queue wq WHERE wq.inscricao_id = ie.id
  )
ON CONFLICT (inscricao_id) DO UPDATE 
SET 
  status = 'pending',
  attempts = 0,
  processing_started_at = NULL,
  error_message = NULL;

-- 4. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_workflow_queue_status_attempts 
ON workflow_queue(status, attempts) 
WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_inscricoes_workflow_status 
ON inscricoes_edital(workflow_execution_id, status) 
WHERE workflow_execution_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_workflow_executions_status 
ON workflow_executions(status, started_at) 
WHERE status = 'running';

-- 5. Função de Manutenção Automática
CREATE OR REPLACE FUNCTION cleanup_orphan_workflows()
RETURNS TABLE(cleaned_executions int, reset_queue_items int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cleaned_executions int := 0;
  v_reset_queue int := 0;
BEGIN
  -- Limpar execuções órfãs antigas (>24h sem inscrição)
  DELETE FROM workflow_executions
  WHERE id IN (
    SELECT we.id 
    FROM workflow_executions we
    LEFT JOIN inscricoes_edital ie ON ie.workflow_execution_id = we.id
    WHERE ie.id IS NULL
      AND we.started_at < NOW() - INTERVAL '24 hours'
  );
  GET DIAGNOSTICS v_cleaned_executions = ROW_COUNT;
  
  -- Resetar itens travados na fila (>30 min processando)
  UPDATE workflow_queue
  SET 
    status = 'pending',
    processing_started_at = NULL
  WHERE status = 'processing'
    AND processing_started_at < NOW() - INTERVAL '30 minutes';
  GET DIAGNOSTICS v_reset_queue = ROW_COUNT;
  
  RETURN QUERY SELECT v_cleaned_executions, v_reset_queue;
END;
$$;

COMMENT ON FUNCTION cleanup_orphan_workflows() IS 'Função de manutenção para limpar workflows órfãos e resetar itens travados';
