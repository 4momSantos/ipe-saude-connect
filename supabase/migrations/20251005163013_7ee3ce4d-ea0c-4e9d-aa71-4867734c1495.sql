-- Etapa 4: Criar função de fallback para processar inscrições órfãs
-- Reprocessa inscrições que ficaram sem workflow_execution_id vinculada

CREATE OR REPLACE FUNCTION process_orphan_inscricoes()
RETURNS TABLE (
  inscricao_id uuid,
  edital_id uuid,
  workflow_id uuid,
  action_taken text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH orphan_inscricoes AS (
    -- Buscar inscrições em_analise ou pendente_workflow sem workflow_execution_id
    -- há mais de 5 minutos e com edital que tenha workflow vinculada
    SELECT 
      i.id as inscricao_id,
      i.edital_id,
      e.workflow_id,
      CASE 
        WHEN i.status = 'em_analise' THEN 'Marcada como pendente_workflow'
        ELSE 'Já está pendente_workflow'
      END as action_taken
    FROM inscricoes_edital i
    JOIN editais e ON e.id = i.edital_id
    WHERE i.workflow_execution_id IS NULL
      AND i.status IN ('em_analise', 'pendente_workflow')
      AND e.workflow_id IS NOT NULL
      AND i.created_at < NOW() - INTERVAL '5 minutes'
    LIMIT 20
  ),
  updated_inscricoes AS (
    -- Atualizar status das inscrições órfãs para pendente_workflow
    UPDATE inscricoes_edital
    SET status = 'pendente_workflow',
        updated_at = NOW()
    WHERE id IN (SELECT inscricao_id FROM orphan_inscricoes WHERE action_taken = 'Marcada como pendente_workflow')
    RETURNING id
  )
  SELECT * FROM orphan_inscricoes;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION process_orphan_inscricoes() IS 
'Identifica e marca inscrições órfãs (sem workflow vinculada após 5 minutos) para reprocessamento manual ou automático via cron';

-- Exemplo de uso manual:
-- SELECT * FROM process_orphan_inscricoes();