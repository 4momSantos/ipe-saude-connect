-- Limpar completamente e recriar policy RLS para candidatos

-- 1. Remover todas as policies de candidatos (se existirem)
DROP POLICY IF EXISTS "Candidatos podem ver seus credenciados" ON public.credenciados;
DROP POLICY IF EXISTS "Candidatos podem visualizar seus credenciados" ON public.credenciados;

-- 2. Remover função anterior (se existir)
DROP FUNCTION IF EXISTS public.is_credenciado_owner(uuid, uuid);

-- 3. Recriar função SECURITY DEFINER de forma limpa
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

-- 4. Criar nova policy usando UNION para permitir gestores/analistas E candidatos proprietários
CREATE POLICY "Candidatos e gestores podem ver credenciados"
ON public.credenciados
FOR SELECT
USING (
  -- Permite gestores, analistas e admins
  public.has_role(auth.uid(), 'gestor'::app_role)
  OR public.has_role(auth.uid(), 'analista'::app_role)
  OR public.has_role(auth.uid(), 'admin'::app_role)
  -- OU permite candidatos que são proprietários
  OR public.is_credenciado_owner(auth.uid(), id)
);