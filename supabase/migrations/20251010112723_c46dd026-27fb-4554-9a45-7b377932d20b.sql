-- =====================================================
-- MIGRATION: FASES 6-12 - TABELAS E FUNCIONALIDADES
-- =====================================================

-- FASE 6: Integrações e Exportações
-- =====================================================

-- Tabela: API Keys Externas
CREATE TABLE IF NOT EXISTS public.api_keys_externas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  quota_diaria INTEGER DEFAULT 1000,
  quota_utilizada INTEGER DEFAULT 0,
  ultima_utilizacao TIMESTAMPTZ,
  ativo BOOLEAN DEFAULT true,
  criada_por UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para API Keys
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys_externas(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_ativo ON public.api_keys_externas(ativo);

-- RLS para API Keys
ALTER TABLE public.api_keys_externas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar API keys"
  ON public.api_keys_externas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

-- Function: Gerar API Key Externa
CREATE OR REPLACE FUNCTION public.gerar_api_key_externa(
  p_nome TEXT,
  p_quota_diaria INTEGER DEFAULT 1000
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_api_key TEXT;
  v_key_hash TEXT;
  v_key_prefix TEXT;
BEGIN
  -- Gerar chave aleatória (32 bytes = 64 hex chars)
  v_api_key := 'wfe_' || encode(gen_random_bytes(32), 'hex');
  
  -- Hash SHA-256
  v_key_hash := encode(digest(v_api_key, 'sha256'), 'hex');
  
  -- Prefix (primeiros 11 chars)
  v_key_prefix := substring(v_api_key from 1 for 11);
  
  -- Inserir registro
  INSERT INTO public.api_keys_externas (
    nome, 
    key_hash, 
    key_prefix, 
    quota_diaria, 
    criada_por
  )
  VALUES (
    p_nome,
    v_key_hash,
    v_key_prefix,
    p_quota_diaria,
    auth.uid()
  );
  
  -- Retornar chave (só mostra uma vez!)
  RETURN v_api_key;
END;
$$;

-- =====================================================
-- FASE 7: Segurança e Auditoria
-- =====================================================

-- Tabela: Audit Trail (já existe audit_logs, mas vamos criar visão específica)
-- Criar view para facilitar consultas de auditoria
CREATE OR REPLACE VIEW public.view_audit_trail AS
SELECT 
  al.id,
  al.user_id,
  al.user_email,
  al.user_role,
  al.action as operacao,
  al.resource_type as tabela,
  al.resource_id as registro_id,
  al.old_values as dados_antes,
  al.new_values as dados_depois,
  al.metadata,
  al.ip_address,
  al.user_agent,
  al.created_at as timestamp
FROM public.audit_logs al
ORDER BY al.created_at DESC;

-- =====================================================
-- FASE 10: Credenciados Avançada - Categorização
-- =====================================================

-- Tabela: Categorias de Prestadores
CREATE TABLE IF NOT EXISTS public.categorias_prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT DEFAULT '#6366f1',
  icone TEXT DEFAULT 'tag',
  ativo BOOLEAN DEFAULT true,
  criada_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Categorias
CREATE INDEX IF NOT EXISTS idx_categorias_ativo ON public.categorias_prestadores(ativo);

-- RLS para Categorias
ALTER TABLE public.categorias_prestadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar categorias"
  ON public.categorias_prestadores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

CREATE POLICY "Todos podem ver categorias ativas"
  ON public.categorias_prestadores
  FOR SELECT
  USING (ativo = true);

-- Adicionar coluna categoria_id em credenciados (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'credenciados' 
      AND column_name = 'categoria_id'
  ) THEN
    ALTER TABLE public.credenciados 
    ADD COLUMN categoria_id UUID REFERENCES public.categorias_prestadores(id);
    
    CREATE INDEX idx_credenciados_categoria ON public.credenciados(categoria_id);
  END IF;
END $$;

-- Tabela: Histórico de Categorização
CREATE TABLE IF NOT EXISTS public.historico_categorizacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  categoria_anterior_id UUID REFERENCES public.categorias_prestadores(id),
  categoria_nova_id UUID REFERENCES public.categorias_prestadores(id),
  motivo TEXT,
  alterado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Histórico
CREATE INDEX IF NOT EXISTS idx_historico_cat_credenciado ON public.historico_categorizacao(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_historico_cat_timestamp ON public.historico_categorizacao(created_at DESC);

-- RLS para Histórico
ALTER TABLE public.historico_categorizacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver histórico"
  ON public.historico_categorizacao
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

CREATE POLICY "Sistema pode inserir histórico"
  ON public.historico_categorizacao
  FOR INSERT
  WITH CHECK (true);

-- Trigger: Registrar mudanças de categoria
CREATE OR REPLACE FUNCTION public.registrar_mudanca_categoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (OLD.categoria_id IS DISTINCT FROM NEW.categoria_id) THEN
    INSERT INTO public.historico_categorizacao (
      credenciado_id,
      categoria_anterior_id,
      categoria_nova_id,
      alterado_por
    )
    VALUES (
      NEW.id,
      OLD.categoria_id,
      NEW.categoria_id,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_mudanca_categoria ON public.credenciados;
CREATE TRIGGER trigger_mudanca_categoria
  AFTER UPDATE ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_mudanca_categoria();

-- =====================================================
-- FASE 9: Comunicação - Modelos de Justificativa
-- =====================================================

-- Tabela: Modelos de Justificativa
CREATE TABLE IF NOT EXISTS public.modelos_justificativa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('indeferimento', 'notificacao', 'suspensao', 'descredenciamento')),
  texto_padrao TEXT NOT NULL,
  variaveis JSONB DEFAULT '[]',
  ativo BOOLEAN DEFAULT true,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Modelos
CREATE INDEX IF NOT EXISTS idx_modelos_categoria ON public.modelos_justificativa(categoria);
CREATE INDEX IF NOT EXISTS idx_modelos_ativo ON public.modelos_justificativa(ativo);

-- RLS para Modelos
ALTER TABLE public.modelos_justificativa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar modelos"
  ON public.modelos_justificativa
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

CREATE POLICY "Analistas podem ver modelos ativos"
  ON public.modelos_justificativa
  FOR SELECT
  USING (
    ativo = true 
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('analista', 'gestor', 'admin')
    )
  );

-- =====================================================
-- FASE 6: Webhooks para Integração Externa
-- =====================================================

-- Tabela: Webhook Subscriptions
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  eventos TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  retry_policy JSONB DEFAULT '{"max_attempts": 3, "backoff": "exponential"}',
  criado_por UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_ativo ON public.webhook_subscriptions(ativo);
CREATE INDEX IF NOT EXISTS idx_webhooks_eventos ON public.webhook_subscriptions USING GIN(eventos);

-- RLS para Webhooks
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar webhooks"
  ON public.webhook_subscriptions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

-- Tabela: Webhook Deliveries (logs de entregas)
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.webhook_subscriptions(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  tentativas INTEGER DEFAULT 0,
  resposta_status INTEGER,
  resposta_body TEXT,
  erro TEXT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para Deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_subscription ON public.webhook_deliveries(subscription_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_timestamp ON public.webhook_deliveries(created_at DESC);

-- RLS para Deliveries
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver deliveries"
  ON public.webhook_deliveries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

CREATE POLICY "Sistema pode inserir deliveries"
  ON public.webhook_deliveries
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar trigger de updated_at nas novas tabelas
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys_externas;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys_externas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categorias_updated_at ON public.categorias_prestadores;
CREATE TRIGGER update_categorias_updated_at
  BEFORE UPDATE ON public.categorias_prestadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_modelos_updated_at ON public.modelos_justificativa;
CREATE TRIGGER update_modelos_updated_at
  BEFORE UPDATE ON public.modelos_justificativa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_webhooks_updated_at ON public.webhook_subscriptions;
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- DADOS INICIAIS (SEED)
-- =====================================================

-- Categorias padrão
INSERT INTO public.categorias_prestadores (nome, descricao, cor, icone)
VALUES 
  ('Premium', 'Prestadores de alta performance', '#10b981', 'star'),
  ('Padrão', 'Prestadores regulares', '#3b82f6', 'check-circle'),
  ('Atenção', 'Prestadores que precisam de acompanhamento', '#f59e0b', 'alert-triangle'),
  ('Crítico', 'Prestadores com problemas graves', '#ef4444', 'alert-circle')
ON CONFLICT (nome) DO NOTHING;

-- Modelos de justificativa padrão
INSERT INTO public.modelos_justificativa (nome, categoria, texto_padrao, variaveis)
VALUES 
  (
    'Indeferimento - Documentação Incompleta',
    'indeferimento',
    'Prezado(a) {{nome_candidato}},\n\nInformamos que sua inscrição foi INDEFERIDA devido à documentação incompleta.\n\nDocumentos faltantes:\n{{documentos_faltantes}}\n\nAtenciosamente,\nEquipe de Credenciamento',
    '["nome_candidato", "documentos_faltantes"]'::jsonb
  ),
  (
    'Notificação - Prazo para Regularização',
    'notificacao',
    'Prezado(a) {{nome_credenciado}},\n\nNotificamos que há pendências em seu cadastro que devem ser regularizadas até {{prazo_limite}}.\n\nPendências:\n{{lista_pendencias}}\n\nAtenciosamente,\nEquipe de Gestão',
    '["nome_credenciado", "prazo_limite", "lista_pendencias"]'::jsonb
  )
ON CONFLICT DO NOTHING;