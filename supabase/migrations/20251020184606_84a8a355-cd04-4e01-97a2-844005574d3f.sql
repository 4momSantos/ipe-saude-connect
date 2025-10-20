-- Corrigir constraint de unicidade usando partial index
-- Isso permite múltiplos documentos inativos (is_current=false) 
-- mas mantém unicidade para documentos ativos (is_current=true)

-- Remove constraint antiga
ALTER TABLE documentos_credenciados 
  DROP CONSTRAINT IF EXISTS docs_cred_tipo_unico;

-- Cria index parcial que só valida documentos ativos
CREATE UNIQUE INDEX IF NOT EXISTS docs_cred_tipo_unico_idx 
  ON documentos_credenciados (credenciado_id, tipo_documento) 
  WHERE is_current = true;

-- Adiciona comentário explicativo
COMMENT ON INDEX docs_cred_tipo_unico_idx IS 
  'Garante que cada credenciado tenha apenas 1 documento ativo (is_current=true) por tipo. Permite múltiplos documentos inativos do mesmo tipo.';