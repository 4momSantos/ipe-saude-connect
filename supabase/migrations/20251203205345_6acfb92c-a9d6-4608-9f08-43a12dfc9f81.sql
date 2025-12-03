-- Função para buscar contagem de mensagens não lidas em batch
CREATE OR REPLACE FUNCTION public.get_batch_unread_counts(p_inscricao_ids UUID[])
RETURNS TABLE(inscricao_id UUID, unread_count BIGINT)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    wm.inscricao_id,
    COUNT(*)::BIGINT as unread_count
  FROM workflow_messages wm
  WHERE wm.inscricao_id = ANY(p_inscricao_ids)
    AND wm.is_read = false
    AND wm.sender_id != auth.uid()
  GROUP BY wm.inscricao_id
$$;