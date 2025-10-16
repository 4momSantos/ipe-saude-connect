-- ============================================
-- FASE 1: Estrutura de Dados - Documentos de Credenciados
-- ============================================

-- 1.1 Tabela de Tipos de Documentos
CREATE TABLE IF NOT EXISTS public.tipos_documentos_credenciados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  
  -- Regras de Validade
  meses_validade_padrao INTEGER DEFAULT 12,
  dias_alerta_1 INTEGER DEFAULT 30,
  dias_alerta_2 INTEGER DEFAULT 15,
  dias_alerta_3 INTEGER DEFAULT 7,
  
  -- Configuração
  obrigatorio BOOLEAN DEFAULT true,
  renovavel BOOLEAN DEFAULT true,
  categoria TEXT,
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir tipos padrão
INSERT INTO public.tipos_documentos_credenciados (codigo, nome, meses_validade_padrao, categoria, dias_alerta_1) VALUES
  ('CNPJ', 'CNPJ', 24, 'juridico', 30),
  ('ALVARA_SANITARIO', 'Alvará Sanitário', 12, 'sanitario', 30),
  ('CERTIDAO_FEDERAL', 'Certidão Negativa Federal', 6, 'fiscal', 15),
  ('CERTIDAO_ESTADUAL', 'Certidão Negativa Estadual', 6, 'fiscal', 15),
  ('CERTIDAO_MUNICIPAL', 'Certidão Negativa Municipal', 6, 'fiscal', 15),
  ('CNES', 'Cadastro Nacional de Estabelecimentos de Saúde', 24, 'profissional', 30),
  ('CRM_MEDICO', 'CRM Médico', 12, 'profissional', 30),
  ('CONTRATO_SOCIAL', 'Contrato Social', 0, 'juridico', 0)
ON CONFLICT (codigo) DO NOTHING;

-- RLS para tipos de documentos
ALTER TABLE public.tipos_documentos_credenciados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver tipos ativos"
  ON public.tipos_documentos_credenciados FOR SELECT
  USING (ativo = true);

CREATE POLICY "Gestores podem gerenciar tipos"
  ON public.tipos_documentos_credenciados FOR ALL
  USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

-- 1.2 Tabela de Documentos dos Credenciados
CREATE TABLE IF NOT EXISTS public.documentos_credenciados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES credenciados(id) ON DELETE CASCADE,
  
  -- Informações do Documento
  tipo_documento TEXT NOT NULL,
  descricao TEXT,
  numero_documento TEXT,
  
  -- Armazenamento
  url_arquivo TEXT,
  arquivo_nome TEXT,
  arquivo_tamanho INTEGER,
  storage_path TEXT,
  
  -- Datas e Validade
  data_emissao DATE,
  data_vencimento DATE,
  meses_validade INTEGER DEFAULT 12,
  
  -- Status e Controle
  status TEXT CHECK (status IN ('ativo','vencendo','vencido','em_renovacao','invalido')) DEFAULT 'ativo',
  dias_alerta INTEGER DEFAULT 30,
  
  -- Metadata
  observacao TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoria
  criado_por UUID REFERENCES auth.users(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  versao INTEGER DEFAULT 1,
  
  -- Versionamento
  is_current BOOLEAN DEFAULT true,
  substituido_por UUID REFERENCES documentos_credenciados(id),
  substituido_em TIMESTAMPTZ,
  
  CONSTRAINT docs_cred_tipo_unico UNIQUE (credenciado_id, tipo_documento, is_current)
);

CREATE INDEX idx_docs_cred_credenciado ON documentos_credenciados(credenciado_id);
CREATE INDEX idx_docs_cred_status ON documentos_credenciados(status);
CREATE INDEX idx_docs_cred_vencimento ON documentos_credenciados(data_vencimento);
CREATE INDEX idx_docs_cred_current ON documentos_credenciados(is_current) WHERE is_current = true;

-- RLS para documentos
ALTER TABLE public.documentos_credenciados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar documentos credenciados"
  ON public.documentos_credenciados FOR ALL
  USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Credenciados veem seus próprios documentos"
  ON public.documentos_credenciados FOR SELECT
  USING (
    credenciado_id IN (
      SELECT c.id FROM credenciados c
      JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
      WHERE ie.candidato_id = auth.uid()
    )
  );

-- 1.3 Tabela de Histórico
CREATE TABLE IF NOT EXISTS public.documentos_credenciados_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID REFERENCES documentos_credenciados(id) ON DELETE CASCADE,
  
  -- Mudanças de Status
  status_anterior TEXT,
  status_novo TEXT,
  
  -- Detalhes
  acao TEXT NOT NULL,
  comentario TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Auditoria
  usuario_responsavel UUID REFERENCES auth.users(id),
  usuario_nome TEXT,
  data_evento TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hist_docs_cred ON documentos_credenciados_historico(documento_id);

ALTER TABLE public.documentos_credenciados_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores veem histórico de documentos"
  ON public.documentos_credenciados_historico FOR SELECT
  USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode inserir histórico"
  ON public.documentos_credenciados_historico FOR INSERT
  WITH CHECK (true);

-- ============================================
-- FASE 2: Triggers e Automações
-- ============================================

-- 2.1 Trigger: Atualizar Timestamp
CREATE OR REPLACE FUNCTION atualizar_timestamp_docs_credenciados()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_docs_credenciados
  BEFORE UPDATE ON documentos_credenciados
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_timestamp_docs_credenciados();

-- 2.2 Trigger: Registrar Histórico Automático
CREATE OR REPLACE FUNCTION registrar_historico_docs_credenciados()
RETURNS TRIGGER AS $$
DECLARE
  v_user_nome TEXT;
  v_acao TEXT;
BEGIN
  -- Buscar nome do usuário
  SELECT nome INTO v_user_nome FROM profiles WHERE id = auth.uid();
  
  -- Determinar ação
  IF TG_OP = 'INSERT' THEN
    v_acao := 'criacao';
    
    INSERT INTO documentos_credenciados_historico (
      documento_id, status_anterior, status_novo, acao,
      usuario_responsavel, usuario_nome, comentario
    ) VALUES (
      NEW.id, NULL, NEW.status, v_acao,
      auth.uid(), v_user_nome, 'Documento criado'
    );
    
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    v_acao := CASE 
      WHEN NEW.status = 'vencido' THEN 'expiracao'
      WHEN NEW.status = 'ativo' AND OLD.status = 'vencido' THEN 'renovacao'
      ELSE 'alteracao_status'
    END;
    
    INSERT INTO documentos_credenciados_historico (
      documento_id, status_anterior, status_novo, acao,
      usuario_responsavel, usuario_nome,
      comentario
    ) VALUES (
      NEW.id, OLD.status, NEW.status, v_acao,
      auth.uid(), v_user_nome,
      format('Status alterado de %s para %s', OLD.status, NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_historico_docs_credenciados
  AFTER INSERT OR UPDATE ON documentos_credenciados
  FOR EACH ROW
  EXECUTE FUNCTION registrar_historico_docs_credenciados();

-- ============================================
-- FASE 5: Storage Bucket (via SQL)
-- ============================================

-- Criar bucket para documentos de credenciados
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-credenciados', 'documentos-credenciados', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Gestores podem fazer upload
CREATE POLICY "Gestores podem fazer upload docs credenciados"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documentos-credenciados' AND
    (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
  );

-- RLS Policy: Visualização restrita
CREATE POLICY "Credenciados veem seus docs no storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documentos-credenciados' AND
    (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
  );