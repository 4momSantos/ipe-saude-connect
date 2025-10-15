-- Tornar execution_id opcional (nullable) em workflow_messages
-- Agora usamos inscricao_id como filtro principal
ALTER TABLE workflow_messages 
  ALTER COLUMN execution_id DROP NOT NULL;