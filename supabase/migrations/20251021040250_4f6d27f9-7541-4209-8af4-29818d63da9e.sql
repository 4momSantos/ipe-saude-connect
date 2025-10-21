-- Corrigir bug no JOIN da função buscar_credenciados_com_documentos_completo
DROP FUNCTION IF EXISTS buscar_credenciados_com_documentos_completo CASCADE;

CREATE OR REPLACE FUNCTION buscar_credenciados_com_documentos_completo(
  p_termo_busca TEXT DEFAULT NULL,
  p_tipo_documento TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'Ativo',
  p_apenas_com_documentos BOOLEAN DEFAULT FALSE,
  p_apenas_vencidos BOOLEAN DEFAULT FALSE,
  p_limite INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  credenciado_id UUID,
  credenciado_nome TEXT,
  credenciado_cpf TEXT,
  credenciado_cnpj TEXT,
  credenciado_email TEXT,
  credenciado_status TEXT,
  credenciado_numero TEXT,
  total_documentos BIGINT,
  documentos_ativos BIGINT,
  documentos_vencidos BIGINT,
  documentos_vencendo BIGINT,
  proximo_vencimento DATE,
  documentos JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH docs_filtrados AS (
    -- Pré-filtrar documentos com flag de match
    SELECT 
      dc.*,
      CASE 
        WHEN p_termo_busca IS NULL THEN true
        WHEN dc.tipo_documento ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.numero_documento ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.arquivo_nome ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.observacao ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.descricao ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.ocr_resultado IS NOT NULL 
          AND dc.ocr_resultado::text ILIKE '%' || p_termo_busca || '%' THEN true
        ELSE false
      END as doc_match
    FROM documentos_credenciados dc
    WHERE 
      (p_tipo_documento IS NULL OR dc.tipo_documento = p_tipo_documento)
      AND (NOT p_apenas_vencidos OR dc.data_vencimento < CURRENT_DATE)
  ),
  credenciados_filtrados AS (
    -- Credenciados que correspondem aos critérios de busca
    SELECT DISTINCT c.id as cred_id
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
        OR df.doc_match = true
      )
  ),
  docs_por_credenciado AS (
    -- Agregar documentos por credenciado
    SELECT 
      c.id as cred_id,
      c.nome,
      c.cpf,
      c.cnpj,
      c.email,
      c.status as cred_status,
      c.numero_credenciado,
      
      -- Contar TODOS os documentos do credenciado (não apenas os filtrados)
      COUNT(dc.id) as total_docs,
      COUNT(dc.id) FILTER (WHERE dc.is_current = true) as docs_ativos,
      COUNT(dc.id) FILTER (WHERE dc.data_vencimento < CURRENT_DATE) as docs_vencidos,
      COUNT(dc.id) FILTER (
        WHERE dc.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ) as docs_vencendo,
      
      MIN(dc.data_vencimento) FILTER (WHERE dc.data_vencimento >= CURRENT_DATE) as prox_venc,
      
      -- Agregar documentos com flag de match
      jsonb_agg(
        jsonb_build_object(
          'id', dc.id,
          'tipo_documento', dc.tipo_documento,
          'numero_documento', dc.numero_documento,
          'data_emissao', dc.data_emissao,
          'data_vencimento', dc.data_vencimento,
          'arquivo_nome', dc.arquivo_nome,
          'url_arquivo', dc.url_arquivo,
          'observacao', dc.observacao,
          'descricao', dc.descricao,
          'is_current', dc.is_current,
          'status', dc.status,
          'ocr_processado', dc.ocr_processado,
          'dias_para_vencer', 
            CASE 
              WHEN dc.data_vencimento IS NOT NULL
              THEN (dc.data_vencimento - CURRENT_DATE)
              ELSE NULL
            END,
          'match_termo', COALESCE(
            (
              -- Verificar se este documento específico corresponde ao termo
              p_termo_busca IS NULL 
              OR dc.tipo_documento ILIKE '%' || p_termo_busca || '%'
              OR dc.numero_documento ILIKE '%' || p_termo_busca || '%'
              OR dc.arquivo_nome ILIKE '%' || p_termo_busca || '%'
              OR dc.observacao ILIKE '%' || p_termo_busca || '%'
              OR dc.descricao ILIKE '%' || p_termo_busca || '%'
              OR (dc.ocr_resultado IS NOT NULL AND dc.ocr_resultado::text ILIKE '%' || p_termo_busca || '%')
            ), false
          )
        ) ORDER BY 
          -- Documentos que correspondem ao termo aparecem primeiro
          CASE WHEN (
            p_termo_busca IS NOT NULL AND (
              dc.tipo_documento ILIKE '%' || p_termo_busca || '%'
              OR dc.numero_documento ILIKE '%' || p_termo_busca || '%'
              OR dc.arquivo_nome ILIKE '%' || p_termo_busca || '%'
              OR dc.observacao ILIKE '%' || p_termo_busca || '%'
              OR dc.descricao ILIKE '%' || p_termo_busca || '%'
              OR (dc.ocr_resultado IS NOT NULL AND dc.ocr_resultado::text ILIKE '%' || p_termo_busca || '%')
            )
          ) THEN 0 ELSE 1 END,
          dc.data_vencimento ASC NULLS LAST
      ) FILTER (WHERE dc.id IS NOT NULL) as docs_json
      
    FROM credenciados_filtrados cf
    INNER JOIN credenciados c ON c.id = cf.cred_id
    -- JOIN com TODOS os documentos do credenciado (não apenas filtrados)
    LEFT JOIN documentos_credenciados dc ON dc.credenciado_id = c.id
    
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
    CASE WHEN docs_vencidos > 0 THEN 0 ELSE 1 END,
    CASE WHEN docs_vencendo > 0 THEN 0 ELSE 1 END,
    prox_venc ASC NULLS LAST,
    nome ASC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION buscar_credenciados_com_documentos_completo IS 
'Busca credenciados e TODOS seus documentos. O filtro de busca é aplicado apenas para selecionar quais credenciados exibir, mas todos os documentos de cada credenciado são retornados. Busca em: nome credenciado, CPF, CNPJ, email, tipo documento, número documento, nome arquivo, observações, descrição e OCR (JSONB).';