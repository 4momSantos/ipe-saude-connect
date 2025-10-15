-- Corrigir função buscar_documentos para aceitar termo vazio
CREATE OR REPLACE FUNCTION public.buscar_documentos(
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
SET search_path TO 'public'
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
      WHEN p_termo IS NULL OR p_termo = '' THEN 0::real
      ELSE ts_rank(
        to_tsvector('portuguese', dc.texto_busca),
        plainto_tsquery('portuguese', p_termo)
      )
    END as relevancia,
    -- Snippet destacado
    CASE 
      WHEN p_termo IS NULL OR p_termo = '' THEN ''::text
      ELSE ts_headline(
        'portuguese',
        dc.texto_busca,
        plainto_tsquery('portuguese', p_termo),
        'MaxWords=20, MinWords=15, MaxFragments=1'
      )
    END as snippet
  FROM documentos_completos dc
  WHERE 
    -- Busca por texto (CORRIGIDO: aceita string vazia)
    (
      p_termo IS NULL 
      OR p_termo = '' 
      OR to_tsvector('portuguese', dc.texto_busca) @@ plainto_tsquery('portuguese', p_termo)
    )
    -- Filtros
    AND (p_status IS NULL OR dc.status = p_status)
    AND (p_tipo_documento IS NULL OR dc.tipo_documento ILIKE '%' || p_tipo_documento || '%')
    AND (p_credenciado_id IS NULL OR dc.credenciado_id = p_credenciado_id)
    AND (p_data_inicio IS NULL OR dc.created_at >= p_data_inicio::timestamptz)
    AND (p_data_fim IS NULL OR dc.created_at <= p_data_fim::timestamptz)
  ORDER BY 
    CASE WHEN p_termo IS NULL OR p_termo = '' THEN 0 ELSE 1 END DESC,
    relevancia DESC, 
    dc.created_at DESC
  LIMIT p_limit;
END;
$$;