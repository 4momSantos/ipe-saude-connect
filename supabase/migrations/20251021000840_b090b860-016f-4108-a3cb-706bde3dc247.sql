-- Aplicar regra padrão de 12 meses (365 dias) para documentos sem data_vencimento
-- Esta regra se aplica a todos os documentos que têm data_emissao mas não têm data_vencimento definida

UPDATE documentos_credenciados
SET 
  data_vencimento = data_emissao + INTERVAL '12 months',
  atualizado_em = NOW()
WHERE 
  data_vencimento IS NULL 
  AND data_emissao IS NOT NULL;

-- Para documentos sem data_emissao, usar data de criação como fallback
UPDATE documentos_credenciados
SET 
  data_emissao = criado_em::date,
  data_vencimento = (criado_em::date + INTERVAL '12 months'),
  atualizado_em = NOW()
WHERE 
  data_vencimento IS NULL 
  AND data_emissao IS NULL;

-- Comentário explicativo
COMMENT ON COLUMN documentos_credenciados.data_vencimento IS 
  'Data de vencimento do documento. Padrão: 12 meses após emissão (365 dias). Pode ser editada manualmente.';