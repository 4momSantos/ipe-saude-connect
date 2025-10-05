-- Adicionar índice para consulta rápida de rascunhos
CREATE INDEX IF NOT EXISTS idx_inscricoes_rascunhos 
ON public.inscricoes_edital(candidato_id, edital_id, status) 
WHERE status = 'rascunho';

-- Adicionar comentário na coluna status
COMMENT ON COLUMN public.inscricoes_edital.status IS 
'Status da inscrição: rascunho (não enviada), em_analise (enviada), aprovado, inabilitado';

-- Atualizar RLS policy para permitir UPDATE de rascunhos
DROP POLICY IF EXISTS "Candidatos podem atualizar seus rascunhos" ON public.inscricoes_edital;

CREATE POLICY "Candidatos podem atualizar seus rascunhos" 
ON public.inscricoes_edital
FOR UPDATE 
USING (
  auth.uid() = candidato_id 
  AND status = 'rascunho'
)
WITH CHECK (
  auth.uid() = candidato_id 
  AND status IN ('rascunho', 'em_analise')
);