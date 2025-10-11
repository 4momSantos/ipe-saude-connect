-- Trigger para notificar analista quando documento é reenviado
CREATE OR REPLACE FUNCTION notify_analista_documento_reenviado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inscricao_id UUID;
  v_candidato_nome TEXT;
  v_candidato_email TEXT;
  v_analista_id UUID;
BEGIN
  -- Buscar dados da inscrição e analista responsável
  SELECT 
    ie.id, 
    p.nome,
    p.email,
    ie.analisado_por
  INTO 
    v_inscricao_id, 
    v_candidato_nome,
    v_candidato_email,
    v_analista_id
  FROM inscricao_documentos id
  JOIN inscricoes_edital ie ON ie.id = id.inscricao_id
  JOIN profiles p ON p.id = ie.candidato_id
  WHERE id.id = NEW.parent_document_id;
  
  -- Criar notificação in-app para o analista
  IF v_analista_id IS NOT NULL THEN
    INSERT INTO app_notifications (
      user_id,
      type,
      title,
      message,
      related_type,
      related_id
    )
    VALUES (
      v_analista_id,
      'info',
      'Documento Reenviado',
      format('%s reenviou o documento "%s" para análise', v_candidato_nome, NEW.tipo_documento),
      'documento',
      NEW.id
    );
  END IF;
  
  -- Registrar evento na inscrição
  INSERT INTO inscricao_eventos (
    inscricao_id,
    tipo_evento,
    descricao,
    dados,
    usuario_id
  )
  VALUES (
    v_inscricao_id,
    'documento_reenviado',
    format('Documento %s reenviado (versão %s)', NEW.tipo_documento, NEW.versao),
    jsonb_build_object(
      'documento_id', NEW.id,
      'tipo_documento', NEW.tipo_documento,
      'versao', NEW.versao,
      'parent_document_id', NEW.parent_document_id
    ),
    NEW.uploaded_by
  );
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_notify_documento_reenviado ON inscricao_documentos;
CREATE TRIGGER trigger_notify_documento_reenviado
AFTER INSERT ON inscricao_documentos
FOR EACH ROW
WHEN (NEW.parent_document_id IS NOT NULL AND NEW.is_current = true)
EXECUTE FUNCTION notify_analista_documento_reenviado();