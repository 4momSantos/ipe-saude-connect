-- Adicionar coluna external_status para rastreamento de status da Assinafy
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS external_status TEXT;

-- Criar índice para busca rápida por external_id
CREATE INDEX IF NOT EXISTS idx_signature_requests_external_id 
ON signature_requests(external_id) 
WHERE external_id IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN signature_requests.external_status IS 'Status retornado pela API externa (Assinafy): document.signed, document.rejected, document.expired, etc.';
COMMENT ON INDEX idx_signature_requests_external_id IS 'Índice para busca rápida de signature requests por external_id (document_id da Assinafy)';