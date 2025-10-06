-- Corrigir timing da trigger: mudar de BEFORE para AFTER
-- Isso garante que a inscrição exista antes de tentar enfileirar o workflow

DROP TRIGGER IF EXISTS queue_workflow_execution_trigger ON public.inscricoes_edital;

CREATE TRIGGER queue_workflow_execution_trigger
  AFTER INSERT OR UPDATE ON public.inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_workflow_execution();