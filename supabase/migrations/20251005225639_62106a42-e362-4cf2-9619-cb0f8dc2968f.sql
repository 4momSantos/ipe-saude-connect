
-- CORREÇÃO FASE 1-5: Limpar triggers obsoletos e enfileirar inscrições órfãs (CORRIGIDO)

-- ============================================================================
-- Remover trigger e função obsoleta que só faz log
-- ============================================================================
DROP TRIGGER IF EXISTS on_inscricao_created ON inscricoes_edital;
DROP FUNCTION IF EXISTS trigger_workflow_on_inscricao() CASCADE;

-- ============================================================================
-- Enfileirar inscrições existentes que deveriam estar na fila
-- ============================================================================

-- Função auxiliar para enfileirar inscrições órfãs manualmente
CREATE OR REPLACE FUNCTION enqueue_orphan_inscricoes()
RETURNS TABLE(
  result_inscricao_id UUID,
  result_workflow_id UUID,
  result_status TEXT,
  result_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Inserir na fila todas as inscrições que deveriam estar lá
  INSERT INTO workflow_queue (
    inscricao_id,
    workflow_id,
    workflow_version,
    input_data,
    status,
    attempts
  )
  SELECT 
    i.id,
    e.workflow_id,
    e.workflow_version,
    jsonb_build_object(
      'inscricaoId', i.id,
      'candidatoId', i.candidato_id,
      'editalId', i.edital_id,
      'dadosInscricao', i.dados_inscricao
    ),
    'pending'::TEXT,
    0
  FROM inscricoes_edital i
  JOIN editais e ON e.id = i.edital_id
  LEFT JOIN workflow_queue wq ON wq.inscricao_id = i.id
  WHERE i.is_rascunho = false
    AND e.workflow_id IS NOT NULL
    AND wq.id IS NULL
    AND i.status IN ('pendente_workflow', 'em_analise')
  ON CONFLICT (inscricao_id) DO NOTHING;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RAISE NOTICE 'Enfileiradas % inscrições órfãs', v_count;
  
  RETURN QUERY
  SELECT 
    wq.inscricao_id as result_inscricao_id,
    wq.workflow_id as result_workflow_id,
    wq.status as result_status,
    format('Total: %s inscrições enfileiradas', v_count) as result_message
  FROM workflow_queue wq
  WHERE wq.created_at > NOW() - INTERVAL '1 minute'
  LIMIT 10;
END;
$$;

-- Executar enfileiramento de órfãs
SELECT * FROM enqueue_orphan_inscricoes();

-- Comentário
COMMENT ON FUNCTION enqueue_orphan_inscricoes() IS 'Enfileira inscrições que deveriam estar na workflow_queue mas não estão';
