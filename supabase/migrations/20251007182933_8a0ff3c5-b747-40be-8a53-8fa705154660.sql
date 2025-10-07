-- Sprint 1: Criar tabela inscription_templates e FK em editais

-- Tabela de templates de inscrição (define o que candidato deve enviar)
CREATE TABLE IF NOT EXISTS public.inscription_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  anexos_obrigatorios JSONB NOT NULL DEFAULT '[]'::jsonb,
  campos_formulario JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar FK inscription_template_id em editais
ALTER TABLE public.editais 
ADD COLUMN IF NOT EXISTS inscription_template_id UUID REFERENCES public.inscription_templates(id);

-- RLS para inscription_templates
ALTER TABLE public.inscription_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar templates de inscrição"
ON public.inscription_templates
FOR ALL
USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Todos podem ver templates ativos"
ON public.inscription_templates
FOR SELECT
USING (is_active = true);

-- Trigger para updated_at
CREATE TRIGGER update_inscription_templates_updated_at
BEFORE UPDATE ON public.inscription_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_inscription_templates_active ON public.inscription_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_editais_inscription_template ON public.editais(inscription_template_id);

COMMENT ON TABLE public.inscription_templates IS 'Templates reutilizáveis que definem anexos e campos que candidatos devem preencher';
COMMENT ON COLUMN public.inscription_templates.anexos_obrigatorios IS 'Lista JSON de anexos que o candidato deve enviar (formato similar ao anexos_processo_esperados)';
COMMENT ON COLUMN public.inscription_templates.campos_formulario IS 'Definição JSON dos campos do formulário de inscrição';
COMMENT ON COLUMN public.editais.inscription_template_id IS 'Template de inscrição usado neste edital (define coleta de dados)';