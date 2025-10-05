-- Recriar trigger para enfileirar workflows automaticamente
-- Esta trigger dispara quando uma inscrição é criada ou atualizada
-- e garante que o workflow seja adicionado à fila de processamento

CREATE OR REPLACE TRIGGER queue_workflow_execution_trigger
  BEFORE UPDATE OR INSERT ON public.inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION public.queue_workflow_execution();