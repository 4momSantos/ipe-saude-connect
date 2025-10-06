-- Adicionar colunas para controle de reenvios
ALTER TABLE public.inscricoes_edital 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

ALTER TABLE public.workflow_executions 
ADD COLUMN IF NOT EXISTS is_retry BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS previous_execution_id UUID REFERENCES public.workflow_executions(id);

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Candidatos podem reenviar inscrições falhadas" ON public.inscricoes_edital;

-- Criar política para permitir candidatos reenviarem inscrições falhadas
CREATE POLICY "Candidatos podem reenviar inscrições falhadas"
ON public.inscricoes_edital
FOR UPDATE
TO authenticated
USING (
  auth.uid() = candidato_id 
  AND status IN ('inabilitado', 'rejeitado')
  AND retry_count < 3
)
WITH CHECK (
  auth.uid() = candidato_id 
  AND status = 'pendente_workflow'
);