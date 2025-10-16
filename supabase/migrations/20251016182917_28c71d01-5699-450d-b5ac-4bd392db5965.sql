-- Permitir candidatos verem seus próprios credenciados
CREATE POLICY "Candidatos podem ver seus credenciados"
ON public.credenciados
FOR SELECT
USING (
  id IN (
    SELECT c.id 
    FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE ie.candidato_id = auth.uid()
  )
);