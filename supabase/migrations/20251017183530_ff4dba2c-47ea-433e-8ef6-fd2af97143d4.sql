-- ✅ CORREÇÃO 1: Adicionar 'ativo' e 'arquivado' ao status permitido de documentos_credenciados
-- Remove o constraint antigo
ALTER TABLE public.documentos_credenciados 
DROP CONSTRAINT IF EXISTS documentos_credenciados_status_check;

-- Adiciona novo constraint incluindo TODOS os status necessários
ALTER TABLE public.documentos_credenciados 
ADD CONSTRAINT documentos_credenciados_status_check 
CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'em_analise', 'ativo', 'arquivado', 'vencido', 'renovado'));

-- ✅ CORREÇÃO 2: Tornar user_id nullable em audit_logs
ALTER TABLE public.audit_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- ✅ CORREÇÃO 3: Atualizar função log_audit_event para aceitar NULL user_id
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_resource_type text,
  p_resource_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
  v_user_email TEXT;
  v_user_roles TEXT;
  v_user_id UUID;
BEGIN
  -- Tenta obter user_id do auth
  v_user_id := auth.uid();
  
  -- Se NULL, tenta obter do metadata (caso de service role)
  IF v_user_id IS NULL AND p_metadata IS NOT NULL THEN
    v_user_id := (p_metadata->>'system_user_id')::uuid;
  END IF;

  -- Get user email e roles se user_id existir
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;

    SELECT string_agg(role::text, ', ') INTO v_user_roles
    FROM public.user_roles
    WHERE user_id = v_user_id;
  END IF;

  -- Insert audit log (user_id pode ser NULL)
  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    user_role,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata
  )
  VALUES (
    v_user_id,
    v_user_email,
    v_user_roles,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_metadata
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- ✅ Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_system_actions 
ON public.audit_logs(created_at DESC) 
WHERE user_id IS NULL;