-- Criar tabela de templates de contratos
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  conteudo_html TEXT NOT NULL,
  campos_mapeados JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Gestores podem gerenciar templates de contratos"
ON public.contract_templates FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analistas podem ver templates ativos"
ON public.contract_templates FOR SELECT
USING (is_active = true AND (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role)));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_contract_templates_updated_at
BEFORE UPDATE ON public.contract_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna template_id na tabela contratos
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.contract_templates(id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contract_templates_active ON public.contract_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_contract_templates_created_by ON public.contract_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_contratos_template_id ON public.contratos(template_id);