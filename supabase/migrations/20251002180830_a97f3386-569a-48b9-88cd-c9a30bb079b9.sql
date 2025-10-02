-- Criar tabela para armazenar workflows criados no editor visual
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para registrar execuções de workflows
CREATE TABLE public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  current_node_id TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  started_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para registrar execução de cada etapa
CREATE TABLE public.workflow_step_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para armazenar dados de formulários
CREATE TABLE public.workflow_form_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_execution_id UUID NOT NULL REFERENCES public.workflow_step_executions(id) ON DELETE CASCADE,
  form_fields JSONB NOT NULL,
  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX idx_workflows_created_by ON public.workflows(created_by);
CREATE INDEX idx_workflows_is_active ON public.workflows(is_active);
CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_step_executions_execution_id ON public.workflow_step_executions(execution_id);
CREATE INDEX idx_workflow_form_data_execution_id ON public.workflow_form_data(execution_id);

-- Habilitar RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_form_data ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para workflows (usuários autenticados podem ver e criar)
CREATE POLICY "Authenticated users can view workflows"
  ON public.workflows FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create workflows"
  ON public.workflows FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own workflows"
  ON public.workflows FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Políticas RLS para execuções
CREATE POLICY "Authenticated users can view executions"
  ON public.workflow_executions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create executions"
  ON public.workflow_executions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = started_by);

CREATE POLICY "Users can update executions they started"
  ON public.workflow_executions FOR UPDATE
  TO authenticated
  USING (auth.uid() = started_by);

-- Políticas RLS para step executions
CREATE POLICY "Authenticated users can view step executions"
  ON public.workflow_step_executions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create step executions"
  ON public.workflow_step_executions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update step executions"
  ON public.workflow_step_executions FOR UPDATE
  TO authenticated
  USING (true);

-- Políticas RLS para form data
CREATE POLICY "Authenticated users can view form data"
  ON public.workflow_form_data FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can submit form data"
  ON public.workflow_form_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = submitted_by);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON public.workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();