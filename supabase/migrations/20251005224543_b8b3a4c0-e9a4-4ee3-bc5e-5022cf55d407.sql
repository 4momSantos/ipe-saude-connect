-- FASE 1-5: FUNDAÇÃO SQL & TRIGGERS (CORRIGIDO)

-- ============================================================================
-- FASE 1: Limpar dados órfãos e normalizar banco
-- ============================================================================

-- Limpar workflow_executions órfãs (sem step_executions por mais de 1 hora)
UPDATE workflow_executions
SET status = 'failed',
    error_message = 'Execução órfã detectada e marcada como falha'
WHERE status = 'running'
  AND created_at < NOW() - INTERVAL '1 hour'
  AND NOT EXISTS (
    SELECT 1 FROM workflow_step_executions 
    WHERE workflow_step_executions.execution_id = workflow_executions.id
  );

-- Corrigir inscrição específica órfã
UPDATE inscricoes_edital
SET status = 'pendente_workflow',
    workflow_execution_id = NULL,
    updated_at = NOW()
WHERE id = 'eb920aab-8d27-4797-8d76-0f47666a0f58'
  AND workflow_execution_id IS NOT NULL
  AND status IN ('em_analise', 'pendente_workflow');

-- Desabilitar trigger e função automática antiga (usando CASCADE)
DROP TRIGGER IF EXISTS trigger_auto_start_workflow ON inscricoes_edital;
DROP FUNCTION IF EXISTS auto_start_workflow() CASCADE;

-- ============================================================================
-- FASE 2: Criar tabela workflow_queue para processamento assíncrono
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES inscricoes_edital(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  workflow_version INTEGER NOT NULL,
  input_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  UNIQUE(inscricao_id)
);

-- Enable RLS
ALTER TABLE public.workflow_queue ENABLE ROW LEVEL SECURITY;

-- RLS: Sistema pode inserir e atualizar
CREATE POLICY "Sistema pode gerenciar workflow_queue"
ON public.workflow_queue
FOR ALL
USING (true)
WITH CHECK (true);

-- ============================================================================
-- FASE 3: Implementar trigger queue_workflow_execution
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_workflow_execution()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow_id UUID;
  v_workflow_version INTEGER;
  v_input_data JSONB;
BEGIN
  -- Só processar quando is_rascunho muda para false
  IF NEW.is_rascunho = false AND (OLD IS NULL OR OLD.is_rascunho = true) THEN
    
    -- Buscar workflow do edital
    SELECT e.workflow_id, e.workflow_version
    INTO v_workflow_id, v_workflow_version
    FROM editais e
    WHERE e.id = NEW.edital_id;
    
    IF v_workflow_id IS NOT NULL THEN
      -- Preparar input_data
      v_input_data := jsonb_build_object(
        'inscricaoId', NEW.id,
        'candidatoId', NEW.candidato_id,
        'editalId', NEW.edital_id,
        'dadosInscricao', NEW.dados_inscricao
      );
      
      -- Inserir na fila (ON CONFLICT atualiza se já existe)
      INSERT INTO workflow_queue (
        inscricao_id,
        workflow_id,
        workflow_version,
        input_data,
        status,
        attempts
      )
      VALUES (
        NEW.id,
        v_workflow_id,
        v_workflow_version,
        v_input_data,
        'pending',
        0
      )
      ON CONFLICT (inscricao_id) 
      DO UPDATE SET
        workflow_id = EXCLUDED.workflow_id,
        workflow_version = EXCLUDED.workflow_version,
        input_data = EXCLUDED.input_data,
        status = 'pending',
        attempts = 0,
        created_at = NOW(),
        processing_started_at = NULL,
        processed_at = NULL,
        error_message = NULL;
      
      -- Marcar inscrição como pendente_workflow
      NEW.status := 'pendente_workflow';
      
      RAISE NOTICE '[QUEUE] Workflow % enfileirado para inscrição %', v_workflow_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS queue_workflow_execution_trigger ON inscricoes_edital;
CREATE TRIGGER queue_workflow_execution_trigger
  BEFORE INSERT OR UPDATE OF is_rascunho ON inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION queue_workflow_execution();

-- ============================================================================
-- FASE 4: Criar função process_workflow_queue() para worker
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_workflow_queue()
RETURNS TABLE(
  queue_id UUID,
  inscricao_id UUID,
  workflow_id UUID,
  status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wq.id,
    wq.inscricao_id,
    wq.workflow_id,
    wq.status,
    CASE 
      WHEN wq.status = 'pending' THEN 'Pronto para processamento'
      WHEN wq.status = 'processing' THEN 'Em processamento'
      WHEN wq.status = 'completed' THEN 'Concluído'
      WHEN wq.status = 'failed' THEN COALESCE(wq.error_message, 'Falha desconhecida')
      ELSE 'Status desconhecido'
    END as message
  FROM workflow_queue wq
  WHERE wq.status IN ('pending', 'failed')
    AND wq.attempts < wq.max_attempts
  ORDER BY wq.created_at ASC
  LIMIT 20;
END;
$$;

-- ============================================================================
-- FASE 5: Adicionar índices de performance
-- ============================================================================

-- Índices para workflow_queue
CREATE INDEX IF NOT EXISTS idx_workflow_queue_status ON workflow_queue(status) WHERE status IN ('pending', 'processing');
CREATE INDEX IF NOT EXISTS idx_workflow_queue_inscricao ON workflow_queue(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_workflow_queue_created ON workflow_queue(created_at) WHERE status = 'pending';

-- Índices para workflow_executions
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);

-- Índices para workflow_step_executions
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_execution ON workflow_step_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_status ON workflow_step_executions(status) WHERE status IN ('pending', 'running');

-- Índices para inscricoes_edital
CREATE INDEX IF NOT EXISTS idx_inscricoes_edital_status ON inscricoes_edital(status) WHERE status IN ('pendente_workflow', 'em_analise');
CREATE INDEX IF NOT EXISTS idx_inscricoes_edital_workflow_exec ON inscricoes_edital(workflow_execution_id) WHERE workflow_execution_id IS NOT NULL;

-- Índice único para prevenir duplicatas de inscrições ativas
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_inscricao 
ON inscricoes_edital(candidato_id, edital_id) 
WHERE is_rascunho = false;

-- Comentários para documentação
COMMENT ON TABLE workflow_queue IS 'Fila de workflows pendentes para processamento assíncrono';
COMMENT ON FUNCTION queue_workflow_execution() IS 'Enfileira workflow quando inscrição é enviada (is_rascunho = false)';
COMMENT ON FUNCTION process_workflow_queue() IS 'Retorna workflows pendentes para processamento pelo worker';