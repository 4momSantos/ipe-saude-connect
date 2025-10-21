-- DROP das versões conflitantes da função
DROP FUNCTION IF EXISTS buscar_credenciados_com_documentos(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS buscar_credenciados_com_documentos(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER);

-- Criar função UNIFICADA e CORRIGIDA
CREATE OR REPLACE FUNCTION buscar_credenciados_com_documentos(
  p_termo_busca TEXT DEFAULT NULL,
  p_tipo_documento TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'Ativo',
  p_apenas_com_documentos BOOLEAN DEFAULT FALSE,
  p_apenas_vencidos BOOLEAN DEFAULT FALSE,
  p_limite INTEGER DEFAULT 1000,
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
) 
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH docs_por_credenciado AS (
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
      COUNT(dc.id) FILTER (WHERE dc.status IN ('ativo', 'validado')) as docs_ativos,
      COUNT(dc.id) FILTER (WHERE dc.data_vencimento < CURRENT_DATE) as docs_vencidos,
      COUNT(dc.id) FILTER (
        WHERE dc.data_vencimento BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ) as docs_vencendo,
      
      -- Próximo vencimento
      MIN(dc.data_vencimento) FILTER (WHERE dc.data_vencimento >= CURRENT_DATE) as prox_venc,
      
      -- Agregar documentos em JSON
      jsonb_agg(
        jsonb_build_object(
          'id', dc.id,
          'tipo_documento', dc.tipo_documento,
          'numero_documento', dc.numero_documento,
          'data_emissao', dc.data_emissao,
          'data_vencimento', dc.data_vencimento,
          'arquivo_nome', dc.arquivo_nome,
          'url_arquivo', dc.url_arquivo,
          'status', dc.status,
          'criado_em', dc.criado_em,
          'atualizado_em', dc.atualizado_em,
          'dias_para_vencer', 
            CASE 
              WHEN dc.data_vencimento IS NOT NULL 
              THEN (dc.data_vencimento - CURRENT_DATE)::INTEGER
              ELSE NULL
            END
        ) ORDER BY dc.data_vencimento ASC NULLS LAST
      ) FILTER (WHERE dc.id IS NOT NULL) as docs_json
      
    FROM credenciados c
    LEFT JOIN documentos_credenciados dc ON dc.credenciado_id = c.id
      AND (p_tipo_documento IS NULL OR dc.tipo_documento = p_tipo_documento)
      AND (NOT p_apenas_vencidos OR dc.data_vencimento < CURRENT_DATE)
    
    WHERE 
      (p_status IS NULL OR c.status = p_status)
      AND (
        p_termo_busca IS NULL 
        OR c.nome ILIKE '%' || p_termo_busca || '%'
        OR c.cpf ILIKE '%' || p_termo_busca || '%'
        OR c.cnpj ILIKE '%' || p_termo_busca || '%'
        OR c.email ILIKE '%' || p_termo_busca || '%'
      )
    
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
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION buscar_credenciados_com_documentos TO authenticated;
GRANT EXECUTE ON FUNCTION buscar_credenciados_com_documentos TO anon;

-- Comentário
COMMENT ON FUNCTION buscar_credenciados_com_documentos IS 
  'Busca credenciados com documentos usando LEFT JOIN. Corrige erro EXTRACT usando cast direto para INTEGER.';