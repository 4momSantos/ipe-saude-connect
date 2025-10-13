-- Adicionar coluna contrato_id à tabela signature_requests
ALTER TABLE signature_requests
ADD COLUMN contrato_id UUID;

-- Migrar dados existentes (extrair contrato_id do metadata)
UPDATE signature_requests
SET contrato_id = (metadata->>'contrato_id')::UUID
WHERE metadata->>'contrato_id' IS NOT NULL;

-- Adicionar foreign key para contratos
ALTER TABLE signature_requests
ADD CONSTRAINT fk_signature_requests_contrato
FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance de queries
CREATE INDEX idx_signature_requests_contrato_id 
ON signature_requests(contrato_id);

-- Comentário explicativo
COMMENT ON COLUMN signature_requests.contrato_id IS 'Referência direta ao contrato associado à requisição de assinatura';