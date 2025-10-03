-- Create enum for application roles
CREATE TYPE public.app_role AS ENUM ('candidato', 'analista', 'gestor', 'admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for existing tables based on RBAC

-- Credenciados: Gestor can manage, Analista can view
CREATE POLICY "Gestores can manage credenciados"
ON public.credenciados
FOR ALL
USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Analistas can view credenciados"
ON public.credenciados
FOR SELECT
USING (public.has_role(auth.uid(), 'analista'));

-- Credenciado CRMs: Same as credenciados
CREATE POLICY "Gestores can manage CRMs"
ON public.credenciado_crms
FOR ALL
USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Analistas can view CRMs"
ON public.credenciado_crms
FOR SELECT
USING (public.has_role(auth.uid(), 'analista'));

-- Horarios atendimento: Same as credenciados
CREATE POLICY "Gestores can manage horarios"
ON public.horarios_atendimento
FOR ALL
USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Analistas can view horarios"
ON public.horarios_atendimento
FOR SELECT
USING (public.has_role(auth.uid(), 'analista'));

-- Solicitacoes alteracao: Analistas can manage, Candidatos can view their own
CREATE POLICY "Analistas can manage solicitacoes"
ON public.solicitacoes_alteracao
FOR ALL
USING (public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin'));

-- Workflows: Gestor can manage, others can view
CREATE POLICY "Gestores can manage workflows"
ON public.workflows
FOR ALL
USING (public.has_role(auth.uid(), 'gestor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can view workflows"
ON public.workflows
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Workflow executions: Users can view their own, Analistas can view all
CREATE POLICY "Analistas can view all executions"
ON public.workflow_executions
FOR SELECT
USING (public.has_role(auth.uid(), 'analista') OR public.has_role(auth.uid(), 'admin'));

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nome TEXT,
  telefone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email)
  );
  
  -- Assign default role (candidato) to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'candidato');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();