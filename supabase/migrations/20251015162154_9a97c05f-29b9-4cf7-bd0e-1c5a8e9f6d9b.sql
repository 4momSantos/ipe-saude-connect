-- Remover função antiga se existir
DROP FUNCTION IF EXISTS buscar_documentos(text, text, text, uuid, date, date, integer);

-- Criar tipo de retorno
DROP TYPE IF EXISTS documento_busca_resultado CASCADE;
CREATE TYPE documento_busca_resultado AS (
  id uuid,
  inscricao_id uuid,
  tipo_documento text,
  arquivo_nome text,
  arquivo_url text,
  status text,
  created_at timestamptz,
  credenciado_nome text,
  credenciado_cpf text,
  relevancia real,
  snippet text
);

-- Recriar função de busca
CREATE OR REPLACE FUNCTION buscar_documentos(
  p_termo text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_tipo_documento text DEFAULT NULL,
  p_credenciado_id uuid DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS SETOF documento_busca_resultado
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    CASE 
      WHEN p_termo IS NULL THEN 0::real
      ELSE ts_rank(
        to_tsvector('portuguese', dc.texto_busca),
        plainto_tsquery('portuguese', p_termo)
      )
    END as relevancia,
    -- Snippet destacado
    CASE 
      WHEN p_termo IS NULL THEN ''::text
      ELSE ts_headline(
        'portuguese',
        dc.texto_busca,
        plainto_tsquery('portuguese', p_termo),
        'MaxWords=20, MinWords=15, MaxFragments=1'
      )
    END as snippet
  FROM documentos_completos dc
  WHERE 
    -- Busca por texto
    (p_termo IS NULL OR to_tsvector('portuguese', dc.texto_busca) @@ plainto_tsquery('portuguese', p_termo))
    -- Filtros
    AND (p_status IS NULL OR dc.status = p_status)
    AND (p_tipo_documento IS NULL OR dc.tipo_documento ILIKE '%' || p_tipo_documento || '%')
    AND (p_credenciado_id IS NULL OR dc.credenciado_id = p_credenciado_id)
    AND (p_data_inicio IS NULL OR dc.created_at >= p_data_inicio::timestamptz)
    AND (p_data_fim IS NULL OR dc.created_at <= p_data_fim::timestamptz)
  ORDER BY 
    CASE WHEN p_termo IS NULL THEN 0 ELSE 1 END DESC,
    relevancia DESC, 
    dc.created_at DESC
  LIMIT p_limit;
END;
$$;