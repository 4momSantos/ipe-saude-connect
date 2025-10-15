-- Remover materialized view antiga
DROP MATERIALIZED VIEW IF EXISTS documentos_completos CASCADE;

-- Criar view normal para busca de documentos
CREATE VIEW documentos_completos AS
SELECT 
  id.id,
  id.inscricao_id,
  id.tipo_documento,
  id.arquivo_nome,
  id.arquivo_url,
  id.status,
  id.created_at,
  c.nome as credenciado_nome,
  c.cpf as credenciado_cpf,
  c.id as credenciado_id,
  CONCAT_WS(' ',
    id.arquivo_nome,
    id.tipo_documento,
    c.nome,
    c.cpf,
    COALESCE(id.ocr_resultado->>'text', '')
  ) as texto_busca
FROM inscricao_documentos id
LEFT JOIN inscricoes_edital ie ON ie.id = id.inscricao_id
LEFT JOIN credenciados c ON c.inscricao_id = ie.id
WHERE id.arquivo_url IS NOT NULL;

-- Criar função imutável para o índice
CREATE OR REPLACE FUNCTION public.documento_search_text(arquivo_nome text, tipo_documento text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(arquivo_nome, '') || ' ' || COALESCE(tipo_documento, '')
$$;

-- Criar índice full-text usando a função imutável
CREATE INDEX IF NOT EXISTS idx_documentos_fulltext 
ON inscricao_documentos 
USING gin(to_tsvector('portuguese', documento_search_text(arquivo_nome, tipo_documento)));

-- Garantir permissões na view
GRANT SELECT ON documentos_completos TO authenticated;