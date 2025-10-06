-- Marcar workflows antigos travados como failed
UPDATE workflow_executions
SET 
  status = 'failed',
  error_message = 'Travado antes das correções do engine - necessário reenviar inscrição',
  completed_at = NOW()
WHERE id IN (
  'a8a87d71-8916-4c6b-a1cc-5f33789a06e4',
  '3cb85d2a-c36b-4459-b3d1-1462cb15325d'
)
AND status = 'running';

-- Atualizar inscrições vinculadas para permitir reenvio
UPDATE inscricoes_edital
SET status = 'pendente_workflow'
WHERE workflow_execution_id IN (
  'a8a87d71-8916-4c6b-a1cc-5f33789a06e4',
  '3cb85d2a-c36b-4459-b3d1-1462cb15325d'
)
AND status = 'em_analise';