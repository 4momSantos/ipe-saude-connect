-- Fix workflow_step_executions constraint to accept all valid statuses
ALTER TABLE workflow_step_executions 
DROP CONSTRAINT IF EXISTS workflow_step_executions_status_check;

ALTER TABLE workflow_step_executions
ADD CONSTRAINT workflow_step_executions_status_check
CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed', 'processing'));