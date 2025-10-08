-- Fase 2: Tabela de checkpoints com versionamento
CREATE TABLE IF NOT EXISTS public.workflow_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  state TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Garantir unicidade por execução + nó + versão
  UNIQUE(execution_id, node_id, version)
);

-- Índices para performance
CREATE INDEX idx_checkpoints_execution ON public.workflow_checkpoints(execution_id);
CREATE INDEX idx_checkpoints_node ON public.workflow_checkpoints(node_id);
CREATE INDEX idx_checkpoints_created ON public.workflow_checkpoints(created_at DESC);

-- Fase 4: Tabela de eventos (Event Sourcing)
CREATE TABLE IF NOT EXISTS public.workflow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT,
  event_type TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Índice para rastreamento temporal
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'WORKFLOW_STARTED', 'WORKFLOW_CONTINUED', 'WORKFLOW_PAUSED',
    'WORKFLOW_COMPLETED', 'WORKFLOW_FAILED', 'WORKFLOW_RETRYING',
    'STEP_STARTED', 'STEP_COMPLETED', 'STEP_FAILED', 'STEP_SKIPPED',
    'STEP_PAUSED', 'STEP_RESUMED', 'STATE_TRANSITION'
  ))
);

CREATE INDEX idx_events_execution ON public.workflow_events(execution_id);
CREATE INDEX idx_events_timestamp ON public.workflow_events(timestamp DESC);
CREATE INDEX idx_events_type ON public.workflow_events(event_type);

-- Fase 4: Tabela de métricas
CREATE TABLE IF NOT EXISTS public.workflow_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_execution ON public.workflow_metrics(execution_id);
CREATE INDEX idx_metrics_node_type ON public.workflow_metrics(node_type);
CREATE INDEX idx_metrics_status ON public.workflow_metrics(status);
CREATE INDEX idx_metrics_recorded ON public.workflow_metrics(recorded_at DESC);

-- RLS Policies para as novas tabelas
ALTER TABLE public.workflow_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_metrics ENABLE ROW LEVEL SECURITY;

-- Sistema pode gerenciar checkpoints
CREATE POLICY "Sistema pode gerenciar checkpoints"
ON public.workflow_checkpoints FOR ALL
USING (true)
WITH CHECK (true);

-- Sistema pode gerenciar eventos
CREATE POLICY "Sistema pode gerenciar eventos"
ON public.workflow_events FOR ALL
USING (true)
WITH CHECK (true);

-- Sistema pode gerenciar métricas
CREATE POLICY "Sistema pode gerenciar métricas"
ON public.workflow_metrics FOR ALL
USING (true)
WITH CHECK (true);

-- Analistas podem visualizar
CREATE POLICY "Analistas podem ver checkpoints"
ON public.workflow_checkpoints FOR SELECT
USING (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analistas podem ver eventos"
ON public.workflow_events FOR SELECT
USING (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Analistas podem ver métricas"
ON public.workflow_metrics FOR SELECT
USING (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'admin'::app_role));