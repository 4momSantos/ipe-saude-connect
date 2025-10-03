-- Etapa 1: Adicionar campos de workflow na tabela editais
ALTER TABLE public.editais 
ADD COLUMN workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
ADD COLUMN workflow_version INTEGER,
ADD COLUMN gestor_autorizador_id UUID REFERENCES auth.users(id),
ADD COLUMN observacoes_autorizacao TEXT,
ADD COLUMN data_autorizacao TIMESTAMP WITH TIME ZONE;

-- Adicionar índice para otimização
CREATE INDEX idx_editais_workflow_id ON public.editais(workflow_id);

-- Etapa 2: Adicionar campo de workflow_execution na tabela inscricoes_edital
ALTER TABLE public.inscricoes_edital
ADD COLUMN workflow_execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE SET NULL;

-- Adicionar índice para otimização
CREATE INDEX idx_inscricoes_workflow_execution ON public.inscricoes_edital(workflow_execution_id);

-- Etapa 3: Criar tabela de aprovações de workflow
CREATE TABLE public.workflow_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_execution_id UUID NOT NULL REFERENCES public.workflow_step_executions(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'pending')),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS na tabela workflow_approvals
ALTER TABLE public.workflow_approvals ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para workflow_approvals
CREATE POLICY "Analistas e gestores podem ver aprovações"
ON public.workflow_approvals FOR SELECT
USING (
  has_role(auth.uid(), 'analista'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Analistas e gestores podem criar aprovações"
ON public.workflow_approvals FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'analista'::app_role) OR 
   has_role(auth.uid(), 'gestor'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role)) AND
  auth.uid() = approver_id
);

CREATE POLICY "Analistas e gestores podem atualizar suas aprovações"
ON public.workflow_approvals FOR UPDATE
USING (
  auth.uid() = approver_id AND
  (has_role(auth.uid(), 'analista'::app_role) OR 
   has_role(auth.uid(), 'gestor'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role))
);

-- Adicionar índices para otimização
CREATE INDEX idx_workflow_approvals_step_execution ON public.workflow_approvals(step_execution_id);
CREATE INDEX idx_workflow_approvals_approver ON public.workflow_approvals(approver_id);
CREATE INDEX idx_workflow_approvals_decision ON public.workflow_approvals(decision);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_workflow_approvals_updated_at
BEFORE UPDATE ON public.workflow_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para executar workflow automaticamente quando inscrição é criada
CREATE OR REPLACE FUNCTION public.trigger_workflow_on_inscricao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow_id UUID;
  v_workflow_version INTEGER;
BEGIN
  -- Buscar workflow_id do edital
  SELECT workflow_id, workflow_version 
  INTO v_workflow_id, v_workflow_version
  FROM public.editais
  WHERE id = NEW.edital_id;

  -- Se o edital tem workflow vinculada, registrar para execução
  -- A execução real será feita pela edge function
  IF v_workflow_id IS NOT NULL THEN
    -- Aqui apenas marcamos que precisa executar
    -- A edge function será chamada pelo frontend após a criação
    RAISE NOTICE 'Inscrição % criada com workflow % a ser executada', NEW.id, v_workflow_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para inscrições
CREATE TRIGGER on_inscricao_created
AFTER INSERT ON public.inscricoes_edital
FOR EACH ROW
EXECUTE FUNCTION public.trigger_workflow_on_inscricao();