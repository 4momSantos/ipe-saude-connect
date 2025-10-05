-- FASE 1: Correções SQL Completas

-- 1.1: Remover constraint duplicada
ALTER TABLE inscricoes_edital 
DROP CONSTRAINT IF EXISTS inscricoes_edital_edital_id_candidato_id_key;

-- 1.2: Padronizar dados existentes
UPDATE inscricoes_edital 
SET 
  is_rascunho = false,
  status = 'em_analise'
WHERE 
  is_rascunho = true 
  AND status = 'rascunho';

-- 1.3: Corrigir inscrição órfã específica
UPDATE inscricoes_edital
SET 
  status = 'pendente_workflow',
  is_rascunho = false
WHERE 
  id = 'eb920aab-8d27-4797-8d76-0f47666a0f58'
  AND workflow_execution_id IS NULL;

-- 1.4: RLS - Permitir candidatos verem editais de suas inscrições
DROP POLICY IF EXISTS "Candidatos podem ver editais de suas inscrições" ON public.editais;
CREATE POLICY "Candidatos podem ver editais de suas inscrições"
ON public.editais 
FOR SELECT
USING (
  has_role(auth.uid(), 'candidato'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM inscricoes_edital 
    WHERE inscricoes_edital.edital_id = editais.id 
      AND inscricoes_edital.candidato_id = auth.uid()
  )
);

-- FASE 10: Trigger para auto-iniciar workflow
CREATE OR REPLACE FUNCTION public.auto_start_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow_id UUID;
BEGIN
  -- Se inscrição foi enviada (is_rascunho mudou para false)
  IF NEW.is_rascunho = false AND (OLD IS NULL OR OLD.is_rascunho = true) THEN
    
    -- Buscar workflow do edital
    SELECT workflow_id INTO v_workflow_id
    FROM editais
    WHERE id = NEW.edital_id;
    
    IF v_workflow_id IS NOT NULL THEN
      -- Marcar como pendente para processamento
      NEW.status := 'pendente_workflow';
      
      RAISE NOTICE '[TRIGGER] Workflow % agendado para inscrição %', v_workflow_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_start_workflow ON inscricoes_edital;
CREATE TRIGGER trigger_auto_start_workflow
  BEFORE INSERT OR UPDATE OF is_rascunho ON inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION auto_start_workflow();

-- FASE 11: Função para reprocessar inscrições órfãs
CREATE OR REPLACE FUNCTION public.retry_orphan_workflows()
RETURNS TABLE(
  inscricao_id UUID, 
  edital_id UUID,
  workflow_id UUID,
  status TEXT,
  action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.edital_id,
    e.workflow_id,
    i.status,
    'Marcado para reprocessamento' AS action
  FROM inscricoes_edital i
  JOIN editais e ON e.id = i.edital_id
  WHERE i.workflow_execution_id IS NULL
    AND i.is_rascunho = false
    AND i.status IN ('pendente_workflow', 'em_analise')
    AND e.workflow_id IS NOT NULL
    AND i.created_at > NOW() - INTERVAL '7 days'
  ORDER BY i.created_at DESC
  LIMIT 20;
END;
$$;