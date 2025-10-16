-- Adicionar credenciado_id no retorno da função buscar_documentos_completos
DROP FUNCTION IF EXISTS buscar_documentos_completos(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, UUID, DATE, DATE, INTEGER);

CREATE OR REPLACE FUNCTION buscar_documentos_completos(
  p_termo TEXT DEFAULT NULL,
  p_incluir_prazos BOOLEAN DEFAULT FALSE,
  p_incluir_ocr BOOLEAN DEFAULT FALSE,
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
  credenciado_id UUID,
  credenciado_nome TEXT,
  credenciado_cpf TEXT,
  relevancia FLOAT,
  snippet TEXT,
  data_vencimento DATE,
  dias_para_vencer INTEGER,
  status_prazo TEXT,
  ocr_resultado JSONB,
  ocr_processado BOOLEAN,
  ocr_confidence NUMERIC
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.inscricao_id,
    dc.tipo_documento,
    dc.arquivo_nome,
    dc.url_arquivo AS arquivo_url,
    dc.status,
    dc.criado_em AS created_at,
    c.id AS credenciado_id,
    c.nome AS credenciado_nome,
    c.cpf AS credenciado_cpf,
    
    -- Relevância de busca
    CASE 
      WHEN p_termo IS NULL THEN 1.0
      ELSE (
        CASE WHEN dc.arquivo_nome ILIKE '%' || p_termo || '%' THEN 0.5 ELSE 0 END +
        CASE WHEN dc.tipo_documento ILIKE '%' || p_termo || '%' THEN 0.3 ELSE 0 END +
        CASE WHEN c.nome ILIKE '%' || p_termo || '%' THEN 0.2 ELSE 0 END
      )
    END::FLOAT AS relevancia,
    
    -- Snippet
    CASE 
      WHEN p_termo IS NULL THEN NULL
      WHEN dc.arquivo_nome ILIKE '%' || p_termo || '%' THEN dc.arquivo_nome
      WHEN dc.tipo_documento ILIKE '%' || p_termo || '%' THEN dc.tipo_documento
      ELSE NULL
    END AS snippet,
    
    -- Campos de prazo
    CASE WHEN p_incluir_prazos THEN dc.data_vencimento ELSE NULL END AS data_vencimento,
    CASE WHEN p_incluir_prazos THEN (dc.data_vencimento - CURRENT_DATE)::INTEGER ELSE NULL END AS dias_para_vencer,
    CASE 
      WHEN p_incluir_prazos THEN
        CASE 
          WHEN dc.data_vencimento IS NULL THEN 'sem_prazo'
          WHEN (dc.data_vencimento - CURRENT_DATE)::INTEGER < 0 THEN 'vencido'
          WHEN (dc.data_vencimento - CURRENT_DATE)::INTEGER <= 7 THEN 'critico'
          WHEN (dc.data_vencimento - CURRENT_DATE)::INTEGER <= 30 THEN 'atencao'
          ELSE 'valido'
        END
      ELSE NULL 
    END AS status_prazo,
    
    -- Campos de OCR
    CASE WHEN p_incluir_ocr THEN id_doc.ocr_resultado ELSE NULL END AS ocr_resultado,
    CASE WHEN p_incluir_ocr THEN id_doc.ocr_processado ELSE FALSE END AS ocr_processado,
    CASE WHEN p_incluir_ocr THEN id_doc.ocr_confidence ELSE NULL END AS ocr_confidence
    
  FROM documentos_credenciados dc
  INNER JOIN credenciados c ON c.id = dc.credenciado_id
  LEFT JOIN inscricao_documentos id_doc ON id_doc.id = dc.documento_origem_id
  
  WHERE dc.is_current = true
    AND (p_termo IS NULL OR (
      dc.arquivo_nome ILIKE '%' || p_termo || '%' OR
      dc.tipo_documento ILIKE '%' || p_termo || '%' OR
      c.nome ILIKE '%' || p_termo || '%' OR
      c.cpf ILIKE '%' || p_termo || '%'
    ))
    AND (p_status IS NULL OR dc.status = p_status)
    AND (p_tipo_documento IS NULL OR dc.tipo_documento = p_tipo_documento)
    AND (p_credenciado_id IS NULL OR dc.credenciado_id = p_credenciado_id)
    AND (p_data_inicio IS NULL OR dc.criado_em::DATE >= p_data_inicio)
    AND (p_data_fim IS NULL OR dc.criado_em::DATE <= p_data_fim)
  
  ORDER BY relevancia DESC, dc.criado_em DESC
  LIMIT p_limit;
END;
$$;