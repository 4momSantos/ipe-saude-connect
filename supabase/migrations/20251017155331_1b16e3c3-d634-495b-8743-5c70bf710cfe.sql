-- ✅ FASE 5: Sistema de Notificações para Credenciados

-- Função para notificar quando credenciado é criado/ativado
CREATE OR REPLACE FUNCTION public.notificar_novo_credenciado()
RETURNS TRIGGER AS $$
DECLARE
  v_candidato_id UUID;
  v_candidato_nome TEXT;
  v_candidato_email TEXT;
BEGIN
  -- Só notificar quando credenciado é criado como Ativo
  IF NEW.status = 'Ativo' AND (OLD IS NULL OR OLD.status != 'Ativo') THEN
    
    -- Buscar dados do candidato
    SELECT ie.candidato_id, p.nome, p.email
    INTO v_candidato_id, v_candidato_nome, v_candidato_email
    FROM inscricoes_edital ie
    JOIN profiles p ON p.id = ie.candidato_id
    WHERE ie.id = NEW.inscricao_id;
    
    IF v_candidato_id IS NOT NULL THEN
      -- Criar notificação in-app para o candidato
      INSERT INTO app_notifications (
        user_id,
        type,
        title,
        message,
        related_type,
        related_id
      )
      VALUES (
        v_candidato_id,
        'success',
        'Credenciamento Ativo! 🎉',
        format('Parabéns %s! Seu credenciamento foi ativado com sucesso. Número: %s', 
               v_candidato_nome, NEW.numero_credenciado),
        'credenciado',
        NEW.id
      );
      
      -- Chamar edge function para enviar email via pg_net
      BEGIN
        PERFORM net.http_post(
          url := current_setting('app.settings', true)::json->>'supabase_url' || '/functions/v1/notificar-credenciado-ativado',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings', true)::json->>'service_role_key'
          ),
          body := jsonb_build_object(
            'credenciado_id', NEW.id,
            'candidato_nome', v_candidato_nome,
            'candidato_email', v_candidato_email,
            'numero_credenciado', NEW.numero_credenciado,
            'tipo_credenciamento', NEW.tipo_credenciamento
          )
        );
        
        RAISE NOTICE '[NOTIFICACAO] ✅ Email de ativação enviado para %', v_candidato_email;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[NOTIFICACAO] ⚠️ Erro ao enviar email: %', SQLERRM;
      END;
      
      -- Notificar gestores sobre novo credenciado
      INSERT INTO app_notifications (
        user_id,
        type,
        title,
        message,
        related_type,
        related_id
      )
      SELECT 
        ur.user_id,
        'info',
        'Novo Credenciado Ativo',
        format('Credenciado %s (%s) foi ativado. Tipo: %s', 
               NEW.nome, NEW.numero_credenciado, NEW.tipo_credenciamento),
        'credenciado',
        NEW.id
      FROM user_roles ur
      WHERE ur.role IN ('gestor', 'admin');
      
      RAISE NOTICE '[NOTIFICACAO] ✅ Notificações criadas para credenciado %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Trigger para notificações de credenciados
DROP TRIGGER IF EXISTS trigger_notificar_novo_credenciado ON public.credenciados;

CREATE TRIGGER trigger_notificar_novo_credenciado
  AFTER INSERT OR UPDATE OF status
  ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_novo_credenciado();

COMMENT ON TRIGGER trigger_notificar_novo_credenciado ON public.credenciados IS 
'Envia notificações in-app e emails quando um credenciado é ativado';

-- Criar índice para melhorar performance de queries de notificações
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.app_notifications (user_id, is_read, created_at DESC) 
  WHERE is_read = false;

COMMENT ON INDEX idx_notifications_user_unread IS 
'Índice para buscar rapidamente notificações não lidas de um usuário';