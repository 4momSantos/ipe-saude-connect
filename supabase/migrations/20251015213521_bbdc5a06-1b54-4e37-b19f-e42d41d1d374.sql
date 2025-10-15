-- =====================================================
-- CORREÇÃO CRÍTICA: PROFILES SEM RLS
-- =====================================================

-- 1. Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Política: usuário vê apenas seu próprio perfil
CREATE POLICY "Usuários veem apenas próprio perfil"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 3. Política: gestores/admins veem todos os perfis
CREATE POLICY "Gestores veem todos os perfis"
ON public.profiles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role)
);

-- 4. Política: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Usuários atualizam apenas próprio perfil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Política: sistema pode inserir perfis via trigger (SECURITY DEFINER)
CREATE POLICY "Sistema pode inserir perfis"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- CORREÇÃO CRÍTICA: INSCRICAO_DOCUMENTOS PERMISSIVA
-- =====================================================

-- Remover política permissiva existente se houver
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.inscricao_documentos;
DROP POLICY IF EXISTS "Todos podem ver documentos" ON public.inscricao_documentos;

-- 1. Política: dono do documento
CREATE POLICY "Usuários veem apenas próprios documentos"
ON public.inscricao_documentos FOR SELECT
TO authenticated
USING (uploaded_by = auth.uid());

-- 2. Política: analista da inscrição ou gestores
CREATE POLICY "Analistas veem documentos das inscrições atribuídas"
ON public.inscricao_documentos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM inscricoes_edital ie
    WHERE ie.id = inscricao_documentos.inscricao_id
      AND ie.analisado_por = auth.uid()
  ) OR
  has_role(auth.uid(), 'analista'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);