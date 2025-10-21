-- Remover constraint UNIQUE antiga que impedia múltiplas especialidades por CRM
ALTER TABLE credenciado_crms 
DROP CONSTRAINT IF EXISTS credenciado_crms_credenciado_id_crm_uf_crm_key;

-- Criar nova constraint UNIQUE que permite múltiplas especialidades por CRM
ALTER TABLE credenciado_crms 
ADD CONSTRAINT credenciado_crms_credenciado_crm_uf_especialidade_key 
UNIQUE (credenciado_id, crm, uf_crm, especialidade_id);

-- Garantir que especialidade_id não seja NULL
ALTER TABLE credenciado_crms 
ADD CONSTRAINT credenciado_crms_especialidade_id_not_null 
CHECK (especialidade_id IS NOT NULL);

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_credenciado_crms_especialidade 
ON credenciado_crms(especialidade_id);

CREATE INDEX IF NOT EXISTS idx_credenciado_crms_credenciado_crm 
ON credenciado_crms(credenciado_id, crm, uf_crm);