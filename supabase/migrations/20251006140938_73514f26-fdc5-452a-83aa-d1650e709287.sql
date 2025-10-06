-- Limpeza (agora funcionará)
UPDATE workflow_executions
SET status = 'failed', error_message = '[CLEANUP] Órfão', completed_at = NOW()
WHERE id IN (
  SELECT we.id FROM workflow_executions we
  LEFT JOIN inscricoes_edital ie ON ie.workflow_execution_id = we.id
  WHERE ie.id IS NULL AND we.status = 'running' 
    AND we.started_at < NOW() - INTERVAL '1 hour'
);

UPDATE signature_requests
SET status = 'completed', completed_at = NOW()
WHERE workflow_execution_id = '3cb85d2a-c36b-4459-b3d1-1462cb15325d';

UPDATE workflow_step_executions
SET status = 'completed', completed_at = NOW()
WHERE execution_id = '3cb85d2a-c36b-4459-b3d1-1462cb15325d' AND node_type = 'signature';