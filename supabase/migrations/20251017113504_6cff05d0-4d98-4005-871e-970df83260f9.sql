-- Adicionar política de DELETE para inscricoes_edital
-- Apenas gestores e admins podem excluir inscrições
CREATE POLICY "Gestores e admins podem excluir inscrições"
ON public.inscricoes_edital
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);