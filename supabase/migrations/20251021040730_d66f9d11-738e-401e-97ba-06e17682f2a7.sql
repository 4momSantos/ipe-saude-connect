-- Corrige a função de busca para retornar todos os credenciamentos (múltiplos editais)
-- Remove DISTINCT e prioriza credenciamentos com mais documentos

DROP FUNCTION IF EXISTS buscar_credenciados_com_documentos_completo;

CREATE OR REPLACE FUNCTION buscar_credenciados_com_documentos_completo(
  p_termo_busca TEXT DEFAULT NULL,
  p_tipo_documento TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'Ativo',
  p_apenas_com_documentos BOOLEAN DEFAULT FALSE,
  p_apenas_vencidos BOOLEAN DEFAULT FALSE,
  p_limite INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
  credenciado_id uuid,
  credenciado_nome text,
  credenciado_cpf text,
  credenciado_cnpj text,
  credenciado_email text,
  credenciado_status text,
  credenciado_numero text,
  total_documentos bigint,
  documentos_ativos bigint,
  documentos_vencidos bigint,
  documentos_vencendo bigint,
  proximo_vencimento date,
  documentos jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH docs_filtrados AS (
    SELECT 
      dc.*,
      CASE 
        WHEN p_termo_busca IS NULL THEN true
        WHEN dc.tipo_documento ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.numero_documento ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.arquivo_nome ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.observacao ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.descricao ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.ocr_resultado::text ILIKE '%' || p_termo_busca || '%' THEN true
        ELSE false
      END as doc_match
    FROM documentos_credenciados dc
    WHERE 
      (p_tipo_documento IS NULL OR dc.tipo_documento = p_tipo_documento)
      AND (NOT p_apenas_vencidos OR dc.data_vencimento < CURRENT_DATE)
  ),
  credenciados_filtrados AS (
    -- ✅ Removido DISTINCT para manter todos os credenciamentos
    SELECT c.id as cred_id
    FROM credenciados c
    LEFT JOIN docs_filtrados df ON df.credenciado_id = c.id
    WHERE 
      (p_status IS NULL OR c.status = p_status)
      AND (
        p_termo_busca IS NULL 
        OR c.nome ILIKE '%' || p_termo_busca || '%'
        OR c.cpf ILIKE '%' || p_termo_busca || '%'
        OR c.cnpj ILIKE '%' || p_termo_busca || '%'
        OR c.email ILIKE '%' || p_termo_busca || '%'
        OR c.numero_credenciado ILIKE '%' || p_termo_busca || '%'
        OR df.doc_match = true
      )
  ),
  docs_por_credenciado AS (
    SELECT 
      c.id as cred_id,
      c.nome,
      c.cpf,
      c.cnpj,
      c.email,
      c.status as cred_status,
      c.numero_credenciado,
      
      COUNT(df.id) as total_docs,
      COUNT(df.id) FILTER (WHERE df.is_current = true) as docs_ativos,
      COUNT(df.id) FILTER (WHERE df.data_vencimento < CURRENT_DATE) as docs_vencidos,
      COUNT(df.id) FILTER (
        WHERE df.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ) as docs_vencendo,
      
      MIN(df.data_vencimento) FILTER (WHERE df.data_vencimento >= CURRENT_DATE) as prox_venc,
      
      jsonb_agg(
        jsonb_build_object(
          'id', df.id,
          'tipo_documento', df.tipo_documento,
          'numero_documento', df.numero_documento,
          'data_emissao', df.data_emissao,
          'data_vencimento', df.data_vencimento,
          'arquivo_nome', df.arquivo_nome,
          'url_arquivo', df.url_arquivo,
          'observacao', df.observacao,
          'descricao', df.descricao,
          'is_current', df.is_current,
          'status', df.status,
          'ocr_processado', df.ocr_processado,
          'dias_para_vencer', 
            CASE 
              WHEN df.data_vencimento IS NOT NULL 
              THEN EXTRACT(DAY FROM (df.data_vencimento - CURRENT_DATE))::INTEGER
              ELSE NULL
            END,
          'match_termo', df.doc_match
        ) ORDER BY 
          CASE WHEN df.doc_match THEN 0 ELSE 1 END,
          df.data_vencimento ASC NULLS LAST
      ) FILTER (WHERE df.id IS NOT NULL) as docs_json
      
    FROM credenciados_filtrados cf
    INNER JOIN credenciados c ON c.id = cf.cred_id
    LEFT JOIN docs_filtrados df ON df.credenciado_id = c.id
    
    GROUP BY c.id, c.nome, c.cpf, c.cnpj, c.email, c.status, c.numero_credenciado
  )
  
  SELECT 
    cred_id,
    nome,
    cpf,
    cnpj,
    email,
    cred_status,
    numero_credenciado,
    COALESCE(total_docs, 0),
    COALESCE(docs_ativos, 0),
    COALESCE(docs_vencidos, 0),
    COALESCE(docs_vencendo, 0),
    prox_venc,
    COALESCE(docs_json, '[]'::jsonb)
  FROM docs_por_credenciado
  WHERE 
    (NOT p_apenas_com_documentos OR total_docs > 0)
  ORDER BY
    -- ✅ Priorizar credenciamentos com mais documentos
    total_docs DESC NULLS LAST,
    CASE WHEN docs_vencidos > 0 THEN 0 ELSE 1 END,
    CASE WHEN docs_vencendo > 0 THEN 0 ELSE 1 END,
    prox_venc ASC NULLS LAST,
    numero_credenciado ASC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;