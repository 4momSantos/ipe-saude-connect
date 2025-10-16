-- Atualizar todos os documentos credenciados para terem prazo de 12 meses
UPDATE documentos_credenciados
SET 
  data_vencimento = CASE 
    WHEN data_emissao IS NOT NULL THEN data_emissao + INTERVAL '12 months'
    ELSE CURRENT_DATE + INTERVAL '12 months'
  END,
  meses_validade = 12,
  atualizado_em = NOW()
WHERE data_vencimento IS NULL OR meses_validade IS NULL;

-- Atualizar documentos que já têm data de vencimento mas não têm meses_validade definido
UPDATE documentos_credenciados
SET 
  meses_validade = 12,
  atualizado_em = NOW()
WHERE meses_validade IS NULL;

-- Para documentos futuros, garantir que sempre tenham 12 meses de validade por padrão
ALTER TABLE documentos_credenciados 
  ALTER COLUMN meses_validade SET DEFAULT 12;