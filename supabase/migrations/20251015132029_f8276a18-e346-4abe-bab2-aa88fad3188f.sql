-- ========================================
-- [REQ-19] BUSCA AVANÇADA DE DOCUMENTOS
-- FASE 1: Infraestrutura de Busca
-- ========================================

-- 1️⃣ VIEW Materializada: Documentos + Credenciado
CREATE MATERIALIZED VIEW documentos_completos AS
SELECT 
  d.id,
  d.inscricao_id,
  d.tipo_documento,
  d.arquivo_nome,
  d.arquivo_url,
  d.status,
  d.created_at,
  d.ocr_resultado,
  d.ocr_confidence,
  c.id as credenciado_id,
  c.nome as credenciado_nome,
  c.cpf as credenciado_cpf,
  c.cnpj as credenciado_cnpj,
  -- Texto completo para busca
  (
    d.arquivo_nome || ' ' || 
    d.tipo_documento || ' ' || 
    COALESCE(d.ocr_resultado->>'textoCompleto', '') || ' ' ||
    COALESCE(d.ocr_resultado->>'nome', '') || ' ' ||
    COALESCE(d.ocr_resultado->>'numero', '') || ' ' ||
    c.nome
  ) as texto_busca
FROM inscricao_documentos d
JOIN inscricoes_edital ie ON ie.id = d.inscricao_id
JOIN credenciados c ON c.inscricao_id = ie.id
WHERE d.is_current = true;

-- Índice único
CREATE UNIQUE INDEX idx_documentos_completos_id ON documentos_completos(id);

-- 2️⃣ Índice Full-Text Search (português)
CREATE INDEX idx_documentos_fts 
ON documentos_completos 
USING gin(to_tsvector('portuguese', texto_busca));

-- 3️⃣ Índices de Filtros
CREATE INDEX idx_documentos_status ON documentos_completos(status);
CREATE INDEX idx_documentos_tipo ON documentos_completos(tipo_documento);
CREATE INDEX idx_documentos_data ON documentos_completos(created_at);
CREATE INDEX idx_documentos_credenciado ON documentos_completos(credenciado_id);

-- 4️⃣ Função de Busca com Ranking
CREATE OR REPLACE FUNCTION buscar_documentos(
  p_termo TEXT,
  p_status TEXT DEFAULT NULL,
  p_tipo_documento TEXT DEFAULT NULL,
  p_credenciado_id UUID DEFAULT NULL,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  inscricao_id UUID,
  tipo_documento TEXT,
  arquivo_nome TEXT,
  arquivo_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  credenciado_nome TEXT,
  credenciado_cpf TEXT,
  relevancia REAL,
  snippet TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.inscricao_id,
    dc.tipo_documento,
    dc.arquivo_nome,
    dc.arquivo_url,
    dc.status,
    dc.created_at,
    dc.credenciado_nome,
    dc.credenciado_cpf,
    -- Ranking de relevância
    ts_rank(
      to_tsvector('portuguese', dc.texto_busca),
      plainto_tsquery('portuguese', p_termo)
    ) as relevancia,
    -- Snippet destacado
    ts_headline(
      'portuguese',
      dc.texto_busca,
      plainto_tsquery('portuguese', p_termo),
      'MaxWords=20, MinWords=15, MaxFragments=1'
    ) as snippet
  FROM documentos_completos dc
  WHERE 
    -- Busca por texto
    (p_termo IS NULL OR to_tsvector('portuguese', dc.texto_busca) @@ plainto_tsquery('portuguese', p_termo))
    -- Filtros
    AND (p_status IS NULL OR dc.status = p_status)
    AND (p_tipo_documento IS NULL OR dc.tipo_documento ILIKE '%' || p_tipo_documento || '%')
    AND (p_credenciado_id IS NULL OR dc.credenciado_id = p_credenciado_id)
    AND (p_data_inicio IS NULL OR dc.created_at >= p_data_inicio)
    AND (p_data_fim IS NULL OR dc.created_at <= p_data_fim)
  ORDER BY relevancia DESC, dc.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 5️⃣ Tabela de Histórico de Buscas (Audit/LGPD)
CREATE TABLE historico_buscas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id),
  termo_busca TEXT NOT NULL,
  filtros JSONB,
  total_resultados INTEGER,
  tempo_execucao_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_historico_buscas_usuario ON historico_buscas(usuario_id);
CREATE INDEX idx_historico_buscas_data ON historico_buscas(created_at);

-- RLS para historico_buscas
ALTER TABLE historico_buscas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu histórico"
ON historico_buscas FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Sistema pode inserir histórico"
ON historico_buscas FOR INSERT
WITH CHECK (true);

-- Comentários
COMMENT ON MATERIALIZED VIEW documentos_completos IS 'VIEW materializada com documentos + credenciados para busca otimizada';
COMMENT ON FUNCTION buscar_documentos IS 'Busca full-text em documentos com ranking e snippet';
COMMENT ON TABLE historico_buscas IS 'Auditoria de buscas (compliance LGPD)';