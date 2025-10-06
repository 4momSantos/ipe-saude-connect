-- Fix notify_workflow_events para não quebrar em workflows órfãos
CREATE OR REPLACE FUNCTION public.notify_workflow_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_inscricao RECORD;
BEGIN
  -- Buscar dados da inscrição relacionada (pode não existir)
  SELECT i.candidato_id, i.analisado_por, e.titulo as edital_titulo
  INTO v_inscricao
  FROM public.inscricoes_edital i
  JOIN public.editais e ON e.id = i.edital_id
  WHERE i.workflow_execution_id = NEW.id;
  
  -- Só criar notificações se houver inscrição vinculada
  IF v_inscricao.candidato_id IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
END;
$function$;