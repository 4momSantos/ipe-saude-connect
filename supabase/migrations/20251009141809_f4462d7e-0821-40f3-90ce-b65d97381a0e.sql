-- Permitir que gestores e admins criem inscrições para outros usuários (testes)
CREATE POLICY "Gestores podem criar inscrições para testes"
ON public.inscricoes_edital
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

COMMENT ON POLICY "Gestores podem criar inscrições para testes" 
ON public.inscricoes_edital IS 
'Permite que gestores e admins criem inscrições para qualquer candidato, útil para testes e simulações do fluxo de credenciamento.';