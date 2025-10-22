-- Correção manual da especialidade do credenciado CRED-001041
-- De "Medicina Geral" para "Oftalmologia"

UPDATE credenciado_crms
SET 
  especialidade = 'Oftalmologia',
  especialidade_id = 'c3834818-1e1e-46e8-ae19-fb5b329047b2'
WHERE credenciado_id = (
  SELECT id FROM credenciados WHERE numero_credenciado = 'CRED-001041'
)
AND crm = '15203'
AND uf_crm = 'RS';