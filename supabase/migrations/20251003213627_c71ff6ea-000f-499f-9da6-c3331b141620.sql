-- Criar tabela de templates de formulários
CREATE TABLE public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  category TEXT,
  tags TEXT[],
  usage_count INTEGER DEFAULT 0
);

-- Habilitar RLS
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

-- Policies para form_templates
CREATE POLICY "Gestores e admins podem gerenciar templates"
ON public.form_templates
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analistas podem ver templates ativos"
ON public.form_templates
FOR SELECT
USING (
  is_active = true AND (
    has_role(auth.uid(), 'analista'::app_role) OR 
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Candidatos podem ver templates ativos"
ON public.form_templates
FOR SELECT
USING (is_active = true);

-- Criar índices para performance
CREATE INDEX idx_form_templates_created_by ON public.form_templates(created_by);
CREATE INDEX idx_form_templates_is_active ON public.form_templates(is_active);
CREATE INDEX idx_form_templates_category ON public.form_templates(category);
CREATE INDEX idx_form_templates_tags ON public.form_templates USING GIN(tags);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_form_templates_updated_at
BEFORE UPDATE ON public.form_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();