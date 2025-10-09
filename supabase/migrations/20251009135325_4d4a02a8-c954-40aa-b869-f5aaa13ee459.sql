-- Permitir que candidatos deletem suas próprias inscrições em rascunho ou aguardando análise
CREATE POLICY "Candidatos podem deletar suas inscrições em rascunho"
ON public.inscricoes_edital
FOR DELETE
TO authenticated
USING (
  auth.uid() = candidato_id 
  AND status IN ('rascunho', 'aguardando_analise')
);

COMMENT ON POLICY "Candidatos podem deletar suas inscrições em rascunho" 
ON public.inscricoes_edital IS 
'Permite que candidatos removam inscrições duplicadas durante testes ou correções. Apenas próprias inscrições em estados iniciais.';