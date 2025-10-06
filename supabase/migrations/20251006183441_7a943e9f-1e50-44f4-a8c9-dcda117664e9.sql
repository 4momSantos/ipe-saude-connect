-- Remover política antiga que mistura candidatos com analistas
DROP POLICY IF EXISTS "Candidatos podem ver suas próprias inscrições" ON public.inscricoes_edital;

-- Criar política específica para candidatos
CREATE POLICY "Candidatos podem ver suas inscrições"
ON public.inscricoes_edital
FOR SELECT
TO authenticated
USING (auth.uid() = candidato_id);

-- Criar política específica para analistas, gestores e admins
CREATE POLICY "Analistas e gestores podem ver todas inscrições"
ON public.inscricoes_edital
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'analista'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);