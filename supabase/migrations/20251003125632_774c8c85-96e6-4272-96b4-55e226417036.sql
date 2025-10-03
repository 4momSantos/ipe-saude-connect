-- Add policies for candidatos to view their own data

-- Candidatos can view their own solicitacoes_alteracao
-- Note: Need to add user_id column to solicitacoes_alteracao first
ALTER TABLE public.solicitacoes_alteracao 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update existing records to link to credenciado user if needed
-- This is a placeholder - adjust based on your business logic
UPDATE public.solicitacoes_alteracao 
SET user_id = credenciado_id 
WHERE user_id IS NULL AND credenciado_id IS NOT NULL;

CREATE POLICY "Candidatos podem ver suas próprias solicitações"
ON public.solicitacoes_alteracao
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Candidatos podem criar suas próprias solicitações"
ON public.solicitacoes_alteracao
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Candidatos can view their own workflow executions
CREATE POLICY "Candidatos podem ver suas próprias execuções"
ON public.workflow_executions
FOR SELECT
USING (auth.uid() = started_by);

-- Enhance Analistas permissions for workflow management
CREATE POLICY "Analistas podem atualizar execuções"
ON public.workflow_step_executions
FOR UPDATE
USING (public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin'));

-- Create audit log table for compliance and traceability
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and gestores can view audit logs
CREATE POLICY "Admins e gestores podem ver audit logs"
ON public.audit_logs
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'gestor')
);

-- System can insert audit logs (using service role)
CREATE POLICY "Sistema pode inserir audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
  v_user_email TEXT;
  v_user_roles TEXT;
BEGIN
  -- Get user email
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get user roles as comma-separated string
  SELECT string_agg(role::text, ', ') INTO v_user_roles
  FROM public.user_roles
  WHERE user_id = auth.uid();

  -- Insert audit log
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
    auth.uid(),
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

-- Create trigger function to auto-log role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_old_values JSONB;
  v_new_values JSONB;
BEGIN
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

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for role changes
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();

-- Create trigger function for solicitacoes_alteracao audit
CREATE OR REPLACE FUNCTION public.audit_solicitacao_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'solicitacao_created';
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    v_action := 'solicitacao_status_changed';
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'solicitacao_updated';
  END IF;

  IF v_action IS NOT NULL THEN
    PERFORM public.log_audit_event(
      v_action,
      'solicitacao_alteracao',
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
      to_jsonb(NEW)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for solicitacoes changes
CREATE TRIGGER audit_solicitacoes_alteracao_changes
  AFTER INSERT OR UPDATE ON public.solicitacoes_alteracao
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_solicitacao_changes();

-- Create index for better audit log performance
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);