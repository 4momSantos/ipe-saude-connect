-- Fase 1: Remover constraint duplicada
ALTER TABLE inscricoes_edital 
DROP CONSTRAINT IF EXISTS inscricoes_edital_edital_id_candidato_id_key;

-- Fase 5: Corrigir inscrições órfãs existentes (últimos 7 dias)
UPDATE inscricoes_edital
SET 
  is_rascunho = false,
  updated_at = NOW()
WHERE status = 'em_analise' 
  AND is_rascunho = true
  AND created_at > NOW() - INTERVAL '7 days';