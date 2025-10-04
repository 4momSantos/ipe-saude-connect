-- Criar tabela de processos de inscrição
CREATE TABLE public.inscription_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER DEFAULT 0
);

-- Criar tabela de etapas dos processos
CREATE TABLE public.process_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID NOT NULL REFERENCES public.inscription_processes(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  template_id UUID REFERENCES public.form_templates(id),
  step_name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT true,
  conditional_rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(process_id, step_number)
);

-- Adicionar coluna na tabela editais
ALTER TABLE public.editais 
ADD COLUMN processo_inscricao_id UUID REFERENCES public.inscription_processes(id);

-- Habilitar RLS
ALTER TABLE public.inscription_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;

-- Policies para inscription_processes
CREATE POLICY "Gestores podem gerenciar processos"
  ON public.inscription_processes FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analistas podem ver processos ativos"
  ON public.inscription_processes FOR SELECT
  USING (is_active = true AND (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Candidatos podem ver processos ativos"
  ON public.inscription_processes FOR SELECT
  USING (is_active = true);

-- Policies para process_steps
CREATE POLICY "Gestores podem gerenciar etapas"
  ON public.process_steps FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Todos podem ver etapas de processos ativos"
  ON public.process_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.inscription_processes 
    WHERE id = process_steps.process_id AND is_active = true
  ));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_inscription_processes_updated_at
BEFORE UPDATE ON public.inscription_processes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();