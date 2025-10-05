-- 1.1 Adicionar coluna is_rascunho
ALTER TABLE public.inscricoes_edital 
ADD COLUMN IF NOT EXISTS is_rascunho BOOLEAN DEFAULT true;

-- 1.2 Permitir dados parciais em rascunhos
ALTER TABLE public.inscricoes_edital 
ALTER COLUMN dados_inscricao DROP NOT NULL;

-- 1.3 Índice para performance
CREATE INDEX IF NOT EXISTS idx_inscricoes_rascunho 
ON public.inscricoes_edital(candidato_id, is_rascunho) 
WHERE is_rascunho = true;

-- 1.4 CORRIGIR RLS: Permitir sistema e candidatos atualizarem
DROP POLICY IF EXISTS "Sistema e gestores podem atualizar inscrições" 
ON public.inscricoes_edital;

CREATE POLICY "Candidatos e sistema podem atualizar"
ON public.inscricoes_edital FOR UPDATE TO authenticated
USING (
  auth.uid() = candidato_id OR
  has_role(auth.uid(), 'analista'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() = candidato_id OR
  has_role(auth.uid(), 'analista'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- 1.5 Índice para notificações
CREATE INDEX IF NOT EXISTS idx_notifications_user 
ON public.app_notifications(user_id, is_read);

-- 1.6 Corrigir inscrições órfãs existentes
UPDATE public.inscricoes_edital
SET 
  workflow_execution_id = (
    SELECT we.id FROM public.workflow_executions we
    WHERE we.started_by = inscricoes_edital.candidato_id
      AND we.created_at >= inscricoes_edital.created_at
      AND we.created_at <= inscricoes_edital.created_at + INTERVAL '5 minutes'
    ORDER BY we.created_at DESC
    LIMIT 1
  ),
  status = 'em_analise',
  is_rascunho = false
WHERE workflow_execution_id IS NULL 
  AND status = 'em_analise'
  AND created_at > NOW() - INTERVAL '7 days';