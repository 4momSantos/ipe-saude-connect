-- Atualizar políticas RLS para inscricoes_edital
DROP POLICY IF EXISTS "Candidatos podem ver suas próprias inscrições" ON public.inscricoes_edital;
DROP POLICY IF EXISTS "Analistas e admins podem ver todas inscrições" ON public.inscricoes_edital;
DROP POLICY IF EXISTS "Analistas e admins podem atualizar inscrições" ON public.inscricoes_edital;

CREATE POLICY "Candidatos podem ver suas próprias inscrições"
ON public.inscricoes_edital
FOR SELECT
TO authenticated
USING (
  auth.uid() = candidato_id OR
  has_role(auth.uid(), 'analista'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Analistas e admins podem atualizar inscrições"
ON public.inscricoes_edital
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'analista'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Atualizar políticas RLS para credenciados (candidatos não têm acesso)
DROP POLICY IF EXISTS "Authenticated users can view credenciados" ON public.credenciados;
DROP POLICY IF EXISTS "Authenticated users can insert credenciados" ON public.credenciados;
DROP POLICY IF EXISTS "Authenticated users can update credenciados" ON public.credenciados;
DROP POLICY IF EXISTS "Gestores can manage credenciados" ON public.credenciados;
DROP POLICY IF EXISTS "Analistas can view credenciados" ON public.credenciados;

CREATE POLICY "Analistas podem ver credenciados"
ON public.credenciados
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'analista'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Gestores podem gerenciar credenciados"
ON public.credenciados
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Atualizar políticas RLS para workflows (candidatos não têm acesso)
DROP POLICY IF EXISTS "Authenticated users can view workflows" ON public.workflows;
DROP POLICY IF EXISTS "All authenticated users can view workflows" ON public.workflows;

CREATE POLICY "Analistas e gestores podem ver workflows"
ON public.workflows
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'analista'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Atualizar políticas para editais (todos podem ver)
DROP POLICY IF EXISTS "Todos podem ver editais ativos" ON public.editais;

CREATE POLICY "Todos autenticados podem ver editais"
ON public.editais
FOR SELECT
TO authenticated
USING (true);

-- Permitir inserção de roles sem auth context (para setup inicial)
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_action TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
  -- Only audit if there's an authenticated user
  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      v_action := 'role_assigned';
      v_new_values := jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role,
        'created_by', NEW.created_by
      );
      
      PERFORM public.log_audit_event(
        v_action,
        'user_role',
        NEW.id,
        NULL,
        v_new_values
      );
      
    ELSIF TG_OP = 'DELETE' THEN
      v_action := 'role_removed';
      v_old_values := jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role
      );
      
      PERFORM public.log_audit_event(
        v_action,
        'user_role',
        OLD.id,
        v_old_values,
        NULL
      );
      
    ELSIF TG_OP = 'UPDATE' THEN
      v_action := 'role_updated';
      v_old_values := jsonb_build_object(
        'user_id', OLD.user_id,
        'role', OLD.role
      );
      v_new_values := jsonb_build_object(
        'user_id', NEW.user_id,
        'role', NEW.role
      );
      
      PERFORM public.log_audit_event(
        v_action,
        'user_role',
        NEW.id,
        v_old_values,
        v_new_values
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;