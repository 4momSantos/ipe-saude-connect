-- Corrigir função buscar_credenciados_com_documentos
-- Problema: EXTRACT(DAY FROM ...) falha com subtração de datas quando há NULL

CREATE OR REPLACE FUNCTION buscar_credenciados_com_documentos(
  p_limite INTEGER DEFAULT NULL,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  credenciado_id UUID,
  credenciado_nome TEXT,
  credenciado_cpf TEXT,
  credenciado_numero TEXT,
  total_documentos BIGINT,
  documentos_ativos BIGINT,
  documentos_vencendo BIGINT,
  documentos_vencidos BIGINT,
  documentos_criticos BIGINT,
  prazos JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as credenciado_id,
    c.nome as credenciado_nome,
    c.cpf as credenciado_cpf,
    c.numero_credenciado as credenciado_numero,
    COUNT(dc.id) as total_documentos,
    COUNT(dc.id) FILTER (WHERE dc.ativo = true) as documentos_ativos,
    COUNT(dc.id) FILTER (
      WHERE dc.ativo = true 
      AND dc.data_vencimento IS NOT NULL 
      AND (dc.data_vencimento - CURRENT_DATE)::INTEGER BETWEEN 1 AND 30
    ) as documentos_vencendo,
    COUNT(dc.id) FILTER (
      WHERE dc.ativo = true 
      AND dc.data_vencimento IS NOT NULL 
      AND dc.data_vencimento < CURRENT_DATE
    ) as documentos_vencidos,
    COUNT(dc.id) FILTER (
      WHERE dc.ativo = true 
      AND dc.data_vencimento IS NOT NULL 
      AND (dc.data_vencimento - CURRENT_DATE)::INTEGER BETWEEN -30 AND 0
    ) as documentos_criticos,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', dc.id,
          'tipo_documento', dc.tipo_documento,
          'numero_documento', dc.numero_documento,
          'data_vencimento', dc.data_vencimento,
          'dias_para_vencer', CASE 
            WHEN dc.data_vencimento IS NOT NULL 
            THEN (dc.data_vencimento - CURRENT_DATE)::INTEGER
            ELSE NULL
          END,
          'ativo', dc.ativo,
          'arquivo_url', dc.arquivo_url
        ) ORDER BY dc.data_vencimento ASC NULLS LAST
      ) FILTER (WHERE dc.id IS NOT NULL),
      '[]'::jsonb
    ) as prazos
  FROM credenciados c
  LEFT JOIN documentos_credenciados dc ON dc.credenciado_id = c.id
  WHERE c.ativo = true
  GROUP BY c.id, c.nome, c.cpf, c.numero_credenciado
  ORDER BY c.nome
  LIMIT p_limite
  OFFSET p_offset;
END;
$$;