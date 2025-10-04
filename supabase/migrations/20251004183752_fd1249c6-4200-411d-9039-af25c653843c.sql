-- Fortalecer a função handle_new_user para garantir role candidato
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Criar perfil
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email)
  );
  
  -- Garantir role candidato (com proteção contra duplicatas)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'candidato')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Criar policy que impede usuários de remover a própria role 'candidato'
CREATE POLICY "Users cannot remove their own candidato role"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  NOT (
    auth.uid() = user_id AND 
    role = 'candidato'
  )
);