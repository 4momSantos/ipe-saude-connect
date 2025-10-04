-- FASE 1: Estrutura de Banco de Dados

-- 1.1 Adicionar coluna workflow_execution_id na tabela inscricoes_edital
ALTER TABLE public.inscricoes_edital 
ADD COLUMN IF NOT EXISTS workflow_execution_id UUID 
REFERENCES public.workflow_executions(id) ON DELETE SET NULL;

-- 1.2 Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_inscricoes_workflow_execution 
ON public.inscricoes_edital(workflow_execution_id);

-- 1.3 Criar função para sincronizar status workflow -> inscrição
CREATE OR REPLACE FUNCTION public.sync_workflow_status_to_inscricao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar status da inscrição baseado no status do workflow
  IF NEW.status = 'completed' THEN
    UPDATE public.inscricoes_edital
    SET 
      status = 'aprovado',
      analisado_em = NOW(),
      updated_at = NOW()
    WHERE workflow_execution_id = NEW.id;
    
  ELSIF NEW.status = 'failed' THEN
    UPDATE public.inscricoes_edital
    SET 
      status = 'inabilitado',
      analisado_em = NOW(),
      updated_at = NOW()
    WHERE workflow_execution_id = NEW.id;
    
  ELSIF NEW.status = 'running' AND NEW.current_node_id IS NOT NULL THEN
    -- Se o workflow está rodando e tem nó atual, manter em análise
    UPDATE public.inscricoes_edital
    SET 
      status = 'em_analise',
      updated_at = NOW()
    WHERE workflow_execution_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 1.4 Criar trigger para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_workflow_status ON public.workflow_executions;
CREATE TRIGGER trigger_sync_workflow_status
  AFTER UPDATE OF status ON public.workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_workflow_status_to_inscricao();

-- 1.5 Atualizar trigger de criação de inscrição para iniciar workflow automaticamente
CREATE OR REPLACE FUNCTION public.trigger_workflow_on_inscricao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workflow_id UUID;
  v_workflow_version INTEGER;
BEGIN
  -- Buscar workflow_id do edital
  SELECT workflow_id, workflow_version 
  INTO v_workflow_id, v_workflow_version
  FROM public.editais
  WHERE id = NEW.edital_id;

  -- Se o edital tem workflow vinculado, registrar para execução
  IF v_workflow_id IS NOT NULL THEN
    RAISE NOTICE 'Inscrição % criada com workflow % versão % a ser executado', 
      NEW.id, v_workflow_id, v_workflow_version;
    
    -- Nota: A execução real será iniciada pela edge function execute-workflow
    -- quando o frontend chamar após a criação da inscrição
  END IF;

  RETURN NEW;
END;
$$;

-- 1.6 Criar função para gerar notificações automáticas
CREATE OR REPLACE FUNCTION public.notify_workflow_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inscricao RECORD;
  v_candidato_id UUID;
  v_analista_id UUID;
BEGIN
  -- Buscar dados da inscrição relacionada
  SELECT i.candidato_id, i.analisado_por, e.titulo as edital_titulo
  INTO v_inscricao
  FROM public.inscricoes_edital i
  JOIN public.editais e ON e.id = i.edital_id
  WHERE i.workflow_execution_id = NEW.id;
  
  -- Notificar quando workflow é completado
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.app_notifications (
      user_id, type, title, message, related_type, related_id
    )
    VALUES (
      v_inscricao.candidato_id,
      'success',
      'Inscrição Aprovada',
      'Sua inscrição no edital "' || v_inscricao.edital_titulo || '" foi aprovada!',
      'inscricao',
      NEW.id
    );
  
  -- Notificar quando workflow falha
  ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    INSERT INTO public.app_notifications (
      user_id, type, title, message, related_type, related_id
    )
    VALUES (
      v_inscricao.candidato_id,
      'error',
      'Inscrição Não Aprovada',
      'Sua inscrição no edital "' || v_inscricao.edital_titulo || '" não foi aprovada.',
      'inscricao',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- 1.7 Criar trigger para notificações de workflow
DROP TRIGGER IF EXISTS trigger_notify_workflow_events ON public.workflow_executions;
CREATE TRIGGER trigger_notify_workflow_events
  AFTER UPDATE OF status ON public.workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_workflow_events();

-- 1.8 Habilitar realtime para tabelas relevantes
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_step_executions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inscricoes_edital;