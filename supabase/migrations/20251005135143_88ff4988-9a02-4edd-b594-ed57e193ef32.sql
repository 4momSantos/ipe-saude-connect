-- PARTE 1: Corrigir RLS Policy para permitir sistema vincular workflow

-- Dropar policy restritiva antiga
DROP POLICY IF EXISTS "Analistas e admins podem atualizar inscrições" ON public.inscricoes_edital;

-- Criar policy que permite candidatos atualizarem suas próprias inscrições
-- E permite staff atualizar tudo
CREATE POLICY "Sistema e gestores podem atualizar inscrições"
ON public.inscricoes_edital
FOR UPDATE
TO authenticated
USING (
  -- Candidato pode atualizar sua própria inscrição
  auth.uid() = candidato_id OR
  -- Staff pode atualizar tudo
  has_role(auth.uid(), 'analista'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- Mesma lógica: candidato só sua inscrição, staff pode tudo
  auth.uid() = candidato_id OR
  has_role(auth.uid(), 'analista'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- PARTE 2: Corrigir inscrição órfã existente
UPDATE public.inscricoes_edital
SET 
  workflow_execution_id = 'f0035a56-97bd-49b8-99b3-e5dbf92bb225',
  status = 'em_analise',
  updated_at = NOW()
WHERE id = 'fd71d00d-fc0c-4757-8038-b707a7504ce9';