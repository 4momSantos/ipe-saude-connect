-- ====================================
-- FASE 2 e 3: Tabela de Preferências + Trigger de Arquivamento + Cron Job
-- ====================================

-- 1. Tabela de preferências de usuário para filtros persistentes
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  page_key TEXT NOT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, page_key)
);

-- RLS para user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas preferências"
  ON user_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índice para performance
CREATE INDEX idx_user_preferences_user_page ON user_preferences(user_id, page_key);

-- 2. Trigger para arquivar documentos quando credenciado é suspenso/descredenciado
CREATE OR REPLACE FUNCTION arquivar_documentos_ao_desativar()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('Suspenso', 'Descredenciado') 
     AND (OLD.status IS NULL OR OLD.status = 'Ativo') THEN
    
    -- Marcar documentos como arquivados
    UPDATE documentos_credenciados
    SET 
      status = 'arquivado',
      is_current = false,
      atualizado_em = NOW()
    WHERE credenciado_id = NEW.id
      AND is_current = true;
    
    -- Desativar prazos relacionados
    UPDATE controle_prazos
    SET ativo = false
    WHERE credenciado_id = NEW.id
      AND entidade_tipo = 'documento_credenciado'
      AND ativo = true;
    
    -- Registrar histórico
    INSERT INTO documentos_credenciados_historico (
      documento_id,
      status_anterior,
      status_novo,
      acao,
      usuario_responsavel,
      comentario
    )
    SELECT 
      id,
      'ativo',
      'arquivado',
      'arquivamento_automatico',
      auth.uid(),
      format('Arquivado automaticamente devido a %s do credenciado', NEW.status)
    FROM documentos_credenciados
    WHERE credenciado_id = NEW.id
      AND is_current = true;
    
    RAISE NOTICE '[ARQUIVAR_DOCS] % documentos do credenciado % arquivados', 
      (SELECT COUNT(*) FROM documentos_credenciados WHERE credenciado_id = NEW.id), 
      NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_arquivar_docs_ao_suspender ON credenciados;
CREATE TRIGGER trigger_arquivar_docs_ao_suspender
  AFTER UPDATE ON credenciados
  FOR EACH ROW
  EXECUTE FUNCTION arquivar_documentos_ao_desativar();

-- 3. Cron job para verificação diária de documentos às 8h
-- Primeiro, verificar se já existe e remover
SELECT cron.unschedule('alertas-docs-credenciados-diario') 
WHERE EXISTS (
  SELECT 1 FROM cron.job 
  WHERE jobname = 'alertas-docs-credenciados-diario'
);

-- Criar cron job diário às 8h
SELECT cron.schedule(
  'alertas-docs-credenciados-diario',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url', true) || '/functions/v1/verificar-docs-credenciados',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object('source', 'cron_daily')
  );
  $$
);

COMMENT ON TABLE user_preferences IS 'Armazena preferências de usuário como filtros salvos';
COMMENT ON FUNCTION arquivar_documentos_ao_desativar() IS 'Arquiva documentos automaticamente quando credenciado é suspenso ou descredenciado';