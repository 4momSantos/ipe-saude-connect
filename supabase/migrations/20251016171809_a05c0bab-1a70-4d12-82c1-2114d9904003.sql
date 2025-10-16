-- Corrigir buscar_documentos_completos removendo referência a coluna inexistente
CREATE OR REPLACE FUNCTION buscar_documentos_completos(
  p_termo TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_tipo_documento TEXT DEFAULT NULL,
  p_credenciado_id UUID DEFAULT NULL,
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL,
  p_limit INT DEFAULT 50,
  p_incluir_prazos BOOLEAN DEFAULT FALSE,
  p_incluir_ocr BOOLEAN DEFAULT FALSE,
  p_status_credenciado TEXT DEFAULT NULL,
  p_apenas_habilitados BOOLEAN DEFAULT NULL,
  p_apenas_com_numero BOOLEAN DEFAULT NULL,
  p_incluir_nao_credenciados BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  id UUID,
  inscricao_id UUID,
  credenciado_id UUID,
  credenciado_nome TEXT,
  credenciado_cpf TEXT,
  credenciado_status TEXT,
  credenciado_numero TEXT,
  data_habilitacao TIMESTAMPTZ,
  tipo_documento TEXT,
  arquivo_nome TEXT,
  arquivo_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  prazos JSONB,
  ocr_resultado JSONB,
  is_credenciado BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH documentos_credenciados_filtrados AS (
    SELECT 
      dc.id,
      dc.inscricao_id,
      dc.credenciado_id,
      c.nome AS credenciado_nome,
      c.cpf AS credenciado_cpf,
      c.status AS credenciado_status,
      c.numero_credenciado AS credenciado_numero,
      c.data_habilitacao,
      dc.tipo_documento,
      dc.arquivo_nome,
      dc.url_arquivo AS arquivo_url,
      dc.status,
      dc.criado_em AS created_at,
      CASE 
        WHEN p_incluir_prazos THEN 
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', p.id,
              'tipo_prazo', p.tipo_prazo,
              'data_vencimento', p.data_vencimento,
              'status', p.status
            )
          )
          FROM prazos_credenciamento p
          WHERE p.credenciado_id = dc.credenciado_id)
        ELSE NULL
      END AS prazos,
      CASE 
        WHEN p_incluir_ocr THEN NULL
        ELSE NULL
      END AS ocr_resultado,
      TRUE AS is_credenciado
    FROM documentos_credenciados dc
    INNER JOIN credenciados c ON c.id = dc.credenciado_id
    WHERE dc.is_current = TRUE
      AND (p_credenciado_id IS NULL OR dc.credenciado_id = p_credenciado_id)
      AND (p_tipo_documento IS NULL OR dc.tipo_documento ILIKE '%' || p_tipo_documento || '%')
      AND (p_status IS NULL OR dc.status = p_status)
      AND (p_data_inicio IS NULL OR dc.criado_em >= p_data_inicio)
      AND (p_data_fim IS NULL OR dc.criado_em <= p_data_fim)
      AND (p_status_credenciado IS NULL OR c.status = p_status_credenciado)
      AND (p_apenas_habilitados IS NULL OR (p_apenas_habilitados = TRUE AND c.data_habilitacao IS NOT NULL) OR (p_apenas_habilitados = FALSE AND c.data_habilitacao IS NULL))
      AND (p_apenas_com_numero IS NULL OR (p_apenas_com_numero = TRUE AND c.numero_credenciado IS NOT NULL) OR (p_apenas_com_numero = FALSE AND c.numero_credenciado IS NULL))
      AND (
        p_termo IS NULL 
        OR c.nome ILIKE '%' || p_termo || '%'
        OR c.cpf ILIKE '%' || p_termo || '%'
        OR dc.tipo_documento ILIKE '%' || p_termo || '%'
        OR dc.arquivo_nome ILIKE '%' || p_termo || '%'
      )
  ),
  documentos_inscricoes_filtrados AS (
    SELECT 
      id.id,
      id.inscricao_id,
      NULL::UUID AS credenciado_id,
      p.nome AS credenciado_nome,
      ie.dados_inscricao->'dados_pessoais'->>'cpf' AS credenciado_cpf,
      'Não Credenciado' AS credenciado_status,
      NULL::TEXT AS credenciado_numero,
      NULL::TIMESTAMPTZ AS data_habilitacao,
      id.tipo_documento,
      id.arquivo_nome,
      id.arquivo_url,
      id.status,
      id.created_at,
      NULL::JSONB AS prazos,
      CASE 
        WHEN p_incluir_ocr THEN id.ocr_resultado
        ELSE NULL
      END AS ocr_resultado,
      FALSE AS is_credenciado
    FROM inscricao_documentos id
    INNER JOIN inscricoes_edital ie ON ie.id = id.inscricao_id
    LEFT JOIN profiles p ON p.id = ie.candidato_id
    LEFT JOIN credenciados c ON c.inscricao_id = ie.id
    WHERE p_incluir_nao_credenciados = TRUE
      AND c.id IS NULL
      AND (p_tipo_documento IS NULL OR id.tipo_documento ILIKE '%' || p_tipo_documento || '%')
      AND (p_status IS NULL OR id.status = p_status)
      AND (p_data_inicio IS NULL OR id.created_at >= p_data_inicio)
      AND (p_data_fim IS NULL OR id.created_at <= p_data_fim)
      AND (
        p_termo IS NULL 
        OR p.nome ILIKE '%' || p_termo || '%'
        OR ie.dados_inscricao->'dados_pessoais'->>'cpf' ILIKE '%' || p_termo || '%'
        OR id.tipo_documento ILIKE '%' || p_termo || '%'
        OR id.arquivo_nome ILIKE '%' || p_termo || '%'
      )
  )
  SELECT * FROM (
    SELECT * FROM documentos_credenciados_filtrados
    UNION ALL
    SELECT * FROM documentos_inscricoes_filtrados
  ) combined
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$;