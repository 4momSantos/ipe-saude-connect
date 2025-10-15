-- FASE 3: Backfill de dados existentes
UPDATE public.credenciados c
SET 
  data_solicitacao = ie.created_at,
  data_habilitacao = COALESCE(c.data_habilitacao, c.created_at),
  data_inicio_atendimento = COALESCE(c.data_inicio_atendimento, c.created_at::DATE)
FROM inscricoes_edital ie
WHERE c.inscricao_id = ie.id
  AND c.data_solicitacao IS NULL;