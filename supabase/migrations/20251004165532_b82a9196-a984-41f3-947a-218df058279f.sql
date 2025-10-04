-- Criar tabela de templates de email
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  category TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de solicitações de assinatura
CREATE TABLE IF NOT EXISTS public.signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_execution_id UUID REFERENCES public.workflow_step_executions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'manual',
  document_url TEXT,
  signers JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de notificações in-app
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  related_id UUID,
  related_type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies para email_templates
CREATE POLICY "Gestores podem gerenciar templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analistas podem ver templates"
ON public.email_templates
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies para signature_requests
CREATE POLICY "Analistas podem ver signature requests"
ON public.signature_requests
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema pode criar signature requests"
ON public.signature_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar signature requests"
ON public.signature_requests
FOR UPDATE
TO authenticated
USING (true);

-- RLS Policies para app_notifications
CREATE POLICY "Usuários podem ver suas próprias notificações"
ON public.app_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode criar notificações"
ON public.app_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas próprias notificações"
ON public.app_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_signature_requests_execution ON public.signature_requests(workflow_execution_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON public.signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user ON public.app_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_app_notifications_created ON public.app_notifications(created_at DESC);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signature_requests_updated_at
BEFORE UPDATE ON public.signature_requests
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();