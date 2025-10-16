-- Remover a política problemática
DROP POLICY IF EXISTS "Candidatos podem ver seus credenciados" ON public.credenciados;

-- Criar função SECURITY DEFINER para verificar se o usuário é proprietário do credenciado
CREATE OR REPLACE FUNCTION public.is_credenciado_owner(_user_id uuid, _credenciado_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = _credenciado_id
      AND ie.candidato_id = _user_id
  )
$$;

-- Criar nova política usando a função SECURITY DEFINER
CREATE POLICY "Candidatos podem ver seus credenciados"
ON public.credenciados
FOR SELECT
USING (
  public.is_credenciado_owner(auth.uid(), id)
);