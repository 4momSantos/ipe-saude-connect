-- ==========================================
-- PARTE 1: CORRIGIR RLS DE EDITAIS
-- ==========================================

-- Dropar policy permissiva antiga
DROP POLICY IF EXISTS "Todos autenticados podem ver editais" ON public.editais;

-- Criar policy restritiva baseada em role
CREATE POLICY "Visualização de editais baseada em role"
ON public.editais
FOR SELECT
TO authenticated
USING (
  -- Staff vê tudo
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'analista'::app_role) OR
  -- Candidatos só veem publicados/abertos
  (has_role(auth.uid(), 'candidato'::app_role) AND 
   status IN ('publicado', 'aberto'))
);

-- ==========================================
-- PARTE 2: CRIAR FUNÇÃO RPC PARA GESTORES
-- ==========================================

-- Criar função que retorna gestores (bypassa RLS)
CREATE OR REPLACE FUNCTION public.get_gestores()
RETURNS TABLE (
  id uuid,
  nome text,
  email text
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.nome,
    p.email
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'gestor'::app_role
    AND p.nome IS NOT NULL
    AND p.email IS NOT NULL
  ORDER BY p.nome ASC;
$$;

-- Permitir execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_gestores() TO authenticated;

-- ==========================================
-- PARTE 3: TESTES DE VALIDAÇÃO
-- ==========================================

-- Teste 1: Verificar função foi criada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_gestores' 
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE EXCEPTION 'Função get_gestores() não foi criada!';
  END IF;
  RAISE NOTICE '✅ Função get_gestores() criada com sucesso';
END $$;

-- Teste 2: Verificar policy foi criada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'editais' 
      AND policyname = 'Visualização de editais baseada em role'
  ) THEN
    RAISE EXCEPTION 'RLS Policy não foi criada!';
  END IF;
  RAISE NOTICE '✅ RLS Policy criada com sucesso';
END $$;

-- Teste 3: Verificar se há gestores disponíveis
DO $$
DECLARE
  gestor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO gestor_count FROM get_gestores();
  RAISE NOTICE '✅ Total de gestores disponíveis: %', gestor_count;
  
  IF gestor_count = 0 THEN
    RAISE WARNING '⚠️ Nenhum gestor cadastrado no sistema!';
  END IF;
END $$;