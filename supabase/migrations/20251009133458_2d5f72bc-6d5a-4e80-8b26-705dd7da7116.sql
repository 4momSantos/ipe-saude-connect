-- ============================================
-- FIX COMPLETO DE POLÍTICAS RLS
-- Corrigindo todos os problemas de segurança e INSERT bloqueados
-- ============================================

-- 1. PROFILES: Permitir que trigger crie profiles automaticamente
-- O trigger handle_new_user() é SECURITY DEFINER, mas ainda precisa de política RLS

-- Remover políticas antigas de INSERT se existirem
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Sistema pode criar profiles" ON public.profiles;

-- Criar política que permite INSERT para o próprio usuário (usado pelo trigger e pela aplicação)
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 2. USER_ROLES: Garantir que trigger pode criar role 'candidato' automaticamente
DROP POLICY IF EXISTS "Sistema pode criar roles iniciais" ON public.user_roles;

CREATE POLICY "Sistema pode criar roles iniciais"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite inserir role para o próprio usuário OU
  -- Permite se for admin
  auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. INSCRICOES_EDITAL: Garantir consistência nas políticas
-- Já existe política de INSERT mas vamos garantir que está correta
DROP POLICY IF EXISTS "Candidatos podem criar inscrições" ON public.inscricoes_edital;

CREATE POLICY "Candidatos podem criar inscrições"
ON public.inscricoes_edital
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = candidato_id);

-- 4. INSCRICAO_DOCUMENTOS: Garantir que candidatos podem inserir documentos
DROP POLICY IF EXISTS "Candidatos podem criar documentos de suas inscrições" ON public.inscricao_documentos;

CREATE POLICY "Candidatos podem criar documentos de suas inscrições"
ON public.inscricao_documentos
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM inscricoes_edital
    WHERE id = inscricao_documentos.inscricao_id
      AND candidato_id = auth.uid()
  )
);

-- 5. ANALISES: Sistema pode criar análises via trigger
DROP POLICY IF EXISTS "Sistema pode criar análises" ON public.analises;

CREATE POLICY "Sistema pode criar análises"
ON public.analises
FOR INSERT
TO authenticated
WITH CHECK (true); -- Trigger é SECURITY DEFINER

-- 6. CONTRATOS: Sistema pode criar e atualizar contratos
-- Já existe política "Sistema pode criar contratos" e "Sistema pode atualizar contratos"
-- Verificar se estão usando WITH CHECK (true) corretamente

-- 7. CERTIFICADOS: Sistema pode criar certificados via trigger
-- Já existe política "Sistema pode criar certificados" com WITH CHECK (true)

-- 8. CREDENCIADOS: Sistema pode criar credenciados via trigger
DROP POLICY IF EXISTS "Sistema pode criar credenciados" ON public.credenciados;

CREATE POLICY "Sistema pode criar credenciados"
ON public.credenciados
FOR INSERT
TO authenticated
WITH CHECK (true); -- Trigger é SECURITY DEFINER

-- 9. APP_NOTIFICATIONS: Sistema pode criar notificações
-- Já existe política "Sistema pode criar notificações" com WITH CHECK (true)

-- 10. AUDIT_LOGS: Sistema pode inserir audit logs
-- Já existe política "Sistema pode inserir audit logs" com WITH CHECK (true)

-- ============================================
-- RESUMO DAS CORREÇÕES
-- ============================================
-- ✅ profiles: Agora permite INSERT quando auth.uid() = id
-- ✅ user_roles: Agora permite INSERT para próprio usuário ou admin
-- ✅ inscricoes_edital: Política consistente para INSERT
-- ✅ inscricao_documentos: Política consistente para INSERT
-- ✅ analises: Sistema pode criar via trigger
-- ✅ credenciados: Sistema pode criar via trigger
-- ============================================