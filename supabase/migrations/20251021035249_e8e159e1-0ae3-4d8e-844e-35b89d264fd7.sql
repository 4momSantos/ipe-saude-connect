-- Função melhorada com busca em TODOS os campos relevantes incluindo OCR
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
    -- Filtrar documentos que atendem critérios de busca
    SELECT 
      dc.*,
      -- Flag se documento corresponde ao termo de busca
      CASE 
        WHEN p_termo_busca IS NULL THEN true
        WHEN dc.tipo_documento ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.numero_documento ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.arquivo_nome ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.observacao ILIKE '%' || p_termo_busca || '%' THEN true
        WHEN dc.descricao ILIKE '%' || p_termo_busca || '%' THEN true
        -- Buscar no conteúdo OCR (JSONB)
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
    -- Credenciados que correspondem ao termo de busca
    SELECT DISTINCT c.id as cred_id
    FROM credenciados c
    LEFT JOIN docs_filtrados dc ON dc.credenciado_id = c.id
    WHERE 
      (p_status IS NULL OR c.status = p_status)
      AND (
        p_termo_busca IS NULL 
        OR c.nome ILIKE '%' || p_termo_busca || '%'
        OR c.cpf ILIKE '%' || p_termo_busca || '%'
        OR c.cnpj ILIKE '%' || p_termo_busca || '%'
        OR c.email ILIKE '%' || p_termo_busca || '%'
        OR dc.doc_match = true  -- Inclui credenciados cujos docs correspondem
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
      
      -- Contar documentos
      COUNT(dc.id) as total_docs,
      COUNT(dc.id) FILTER (WHERE dc.is_current = true) as docs_ativos,
      COUNT(dc.id) FILTER (WHERE dc.data_vencimento < CURRENT_DATE) as docs_vencidos,
      COUNT(dc.id) FILTER (
        WHERE dc.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ) as docs_vencendo,
      
      -- Próximo vencimento
      MIN(dc.data_vencimento) FILTER (WHERE dc.data_vencimento >= CURRENT_DATE) as prox_venc,
      
      -- Agregar documentos em JSON com highlighting do match
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
              THEN EXTRACT(DAY FROM (dc.data_vencimento - CURRENT_DATE))::INTEGER
              ELSE NULL
            END,
          'match_termo', df.doc_match  -- Flag se documento corresponde à busca
        ) ORDER BY 
          -- Ordenar docs que correspondem primeiro
          CASE WHEN df.doc_match THEN 0 ELSE 1 END,
          dc.data_vencimento ASC NULLS LAST
      ) FILTER (WHERE dc.id IS NOT NULL) as docs_json
      
    FROM credenciados_filtrados cf
    INNER JOIN credenciados c ON c.id = cf.cred_id
    LEFT JOIN docs_filtrados df ON df.credenciado_id = c.id
    LEFT JOIN documentos_credenciados dc ON dc.id = df.id
    
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
    -- Ordenar por urgência
    CASE WHEN docs_vencidos > 0 THEN 0 ELSE 1 END,
    CASE WHEN docs_vencendo > 0 THEN 0 ELSE 1 END,
    prox_venc ASC NULLS LAST,
    nome ASC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentário da função
COMMENT ON FUNCTION buscar_credenciados_com_documentos_completo IS 
'Busca credenciados e documentos por termo geral. Busca em: nome credenciado, CPF, CNPJ, email, tipo documento, número documento, nome arquivo, observações, descrição e OCR (JSONB).';