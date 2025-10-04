-- Adicionar política RLS para permitir admins e gestores verem perfis de gestores
CREATE POLICY "Admins e gestores podem ver perfis de gestores"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = profiles.id
    AND user_roles.role = 'gestor'::app_role
  )
);