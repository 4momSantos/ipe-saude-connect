-- ============================================
-- FASE 1: ÍNDICES COMPOSTOS OTIMIZADOS
-- ============================================

-- Índice principal para queries ordenadas por data (essencial para paginação)
CREATE INDEX IF NOT EXISTS idx_workflow_messages_inscricao_created 
ON workflow_messages(inscricao_id, created_at DESC);

-- Índice para contagem de não lidas (usado em batch queries)
CREATE INDEX IF NOT EXISTS idx_workflow_messages_inscricao_unread
ON workflow_messages(inscricao_id, is_read, sender_id)
WHERE is_read = false;

-- Índice para realtime (acelera filtros por inscrição + tipo)
CREATE INDEX IF NOT EXISTS idx_workflow_messages_realtime
ON workflow_messages(inscricao_id, sender_type, created_at DESC);

-- ============================================
-- FASE 2: FUNCTION PARA BATCH UNREAD COUNTS
-- ============================================

CREATE OR REPLACE FUNCTION get_batch_unread_counts(p_inscricao_ids uuid[])
RETURNS TABLE(inscricao_id uuid, unread_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    wm.inscricao_id,
    COUNT(*) as unread_count
  FROM workflow_messages wm
  WHERE wm.inscricao_id = ANY(p_inscricao_ids)
    AND wm.is_read = false
    AND wm.sender_id != auth.uid()
  GROUP BY wm.inscricao_id;
$$;

COMMENT ON FUNCTION get_batch_unread_counts IS 'Retorna contagem de mensagens não lidas para múltiplas inscrições em uma única query';

-- ============================================
-- FASE 3: ANALYZE PARA OTIMIZAR PLANOS
-- ============================================

ANALYZE workflow_messages;