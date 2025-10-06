-- Criar trigger para corrigir is_rascunho automaticamente quando workflow_execution_id for atribuído
-- Isso previne estados inconsistentes onde is_rascunho = true mas a inscrição já foi processada

CREATE OR REPLACE FUNCTION public.fix_rascunho_on_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se workflow_execution_id está sendo definido e is_rascunho ainda é true, corrigir
  IF NEW.workflow_execution_id IS NOT NULL AND NEW.is_rascunho = true THEN
    NEW.is_rascunho := false;
    RAISE NOTICE '[FIX_RASCUNHO] Corrigindo is_rascunho para false na inscrição %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger BEFORE INSERT OR UPDATE
DROP TRIGGER IF EXISTS trigger_fix_rascunho_on_workflow ON public.inscricoes_edital;

CREATE TRIGGER trigger_fix_rascunho_on_workflow
  BEFORE INSERT OR UPDATE ON public.inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION public.fix_rascunho_on_workflow();