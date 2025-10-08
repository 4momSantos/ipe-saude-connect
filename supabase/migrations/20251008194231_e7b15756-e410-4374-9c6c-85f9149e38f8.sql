-- MIGRATIONS PARA START NODE COMPLETO
-- Tabelas para suportar Webhook, API Keys e Schedule triggers

-- 1. WEBHOOK TRIGGERS
CREATE TABLE IF NOT EXISTS public.workflow_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  webhook_id TEXT NOT NULL UNIQUE, -- URL-safe ID
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'apikey', 'secret')),
  api_key_hash TEXT, -- Hash SHA-256 da API key
  webhook_secret TEXT, -- Secret para HMAC signature
  payload_schema JSONB, -- JSON Schema para validar payload
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_workflow_webhooks_workflow_id ON public.workflow_webhooks(workflow_id);
CREATE INDEX idx_workflow_webhooks_webhook_id ON public.workflow_webhooks(webhook_id);
CREATE INDEX idx_workflow_webhooks_active ON public.workflow_webhooks(is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER update_workflow_webhooks_updated_at
  BEFORE UPDATE ON public.workflow_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.workflow_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar webhooks"
  ON public.workflow_webhooks
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analistas podem ver webhooks"
  ON public.workflow_webhooks
  FOR SELECT
  USING (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. WEBHOOK EVENTS (Auditoria)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.workflow_webhooks(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  queue_id UUID REFERENCES public.workflow_queue(id),
  payload JSONB NOT NULL,
  source_ip TEXT,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'failed', 'rejected')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_webhook_events_webhook_id ON public.webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_workflow_id ON public.webhook_events(workflow_id);
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);

-- RLS Policies
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver webhook events"
  ON public.webhook_events
  FOR SELECT
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. API KEYS (para trigger manual e webhook)
CREATE TABLE IF NOT EXISTS public.workflow_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE, -- Hash SHA-256
  key_prefix TEXT NOT NULL, -- Primeiros 8 chars para identificação
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_workflow_api_keys_workflow_id ON public.workflow_api_keys(workflow_id);
CREATE INDEX idx_workflow_api_keys_key_hash ON public.workflow_api_keys(key_hash);
CREATE INDEX idx_workflow_api_keys_active ON public.workflow_api_keys(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.workflow_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar API keys"
  ON public.workflow_api_keys
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analistas podem ver API keys"
  ON public.workflow_api_keys
  FOR SELECT
  USING (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 4. SCHEDULE TRIGGERS (Cron Jobs)
CREATE TABLE IF NOT EXISTS public.workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  input_data JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Índices para performance
CREATE INDEX idx_workflow_schedules_workflow_id ON public.workflow_schedules(workflow_id);
CREATE INDEX idx_workflow_schedules_active ON public.workflow_schedules(is_active) WHERE is_active = true;
CREATE INDEX idx_workflow_schedules_next_run ON public.workflow_schedules(next_run_at) WHERE is_active = true;

-- Trigger para updated_at
CREATE TRIGGER update_workflow_schedules_updated_at
  BEFORE UPDATE ON public.workflow_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.workflow_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar schedules"
  ON public.workflow_schedules
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analistas podem ver schedules"
  ON public.workflow_schedules
  FOR SELECT
  USING (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 5. FUNÇÃO HELPER para gerar webhook URL
CREATE OR REPLACE FUNCTION public.generate_webhook_url(p_workflow_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_webhook_id TEXT;
  v_webhook_url TEXT;
BEGIN
  -- Gerar ID único
  v_webhook_id := encode(gen_random_bytes(16), 'hex');
  
  -- Inserir webhook config
  INSERT INTO public.workflow_webhooks (workflow_id, webhook_id, created_by)
  VALUES (p_workflow_id, v_webhook_id, auth.uid());
  
  -- Construir URL (assumindo ambiente Supabase)
  v_webhook_url := current_setting('app.supabase_url', true) || 
                   '/functions/v1/webhook-trigger/' || 
                   p_workflow_id::text || '/' || 
                   v_webhook_id;
  
  RETURN v_webhook_url;
END;
$$;

-- 6. FUNÇÃO HELPER para gerar API Key
CREATE OR REPLACE FUNCTION public.generate_api_key(
  p_workflow_id UUID DEFAULT NULL,
  p_name TEXT DEFAULT 'API Key',
  p_description TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_api_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
BEGIN
  -- Gerar API key aleatória (32 bytes = 64 hex chars)
  v_api_key := 'wf_' || encode(gen_random_bytes(32), 'hex');
  
  -- Hash com SHA-256
  v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');
  
  -- Primeiros 8 chars como prefix
  v_key_prefix := substring(v_api_key from 1 for 11); -- wf_ + 8 chars
  
  -- Inserir na tabela
  INSERT INTO public.workflow_api_keys (workflow_id, key_hash, key_prefix, name, description, created_by)
  VALUES (p_workflow_id, v_key_hash, v_key_prefix, p_name, p_description, auth.uid());
  
  -- Retornar key (só mostramos uma vez!)
  RETURN v_api_key;
END;
$$;

COMMENT ON TABLE public.workflow_webhooks IS 'Configuração de webhooks para disparar workflows';
COMMENT ON TABLE public.webhook_events IS 'Auditoria de eventos de webhook recebidos';
COMMENT ON TABLE public.workflow_api_keys IS 'API keys para autenticação de triggers';
COMMENT ON TABLE public.workflow_schedules IS 'Agendamentos (cron) para execução automática de workflows';