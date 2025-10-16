-- Corrigir função buscar_documentos_completos para resolver erro de UNION
-- O problema é que estamos tentando fazer UNION entre tipos text e jsonb

DROP FUNCTION IF EXISTS buscar_documentos_completos(text, text, text, uuid, date, date, uuid, text, integer, integer);

CREATE OR REPLACE FUNCTION buscar_documentos_completos(
  p_termo text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_tipo_documento text DEFAULT NULL,
  p_credenciado_id uuid DEFAULT NULL,
  p_data_inicio date DEFAULT NULL,
  p_data_fim date DEFAULT NULL,
  p_inscricao_id uuid DEFAULT NULL,
  p_ordenacao text DEFAULT 'recente',
  p_limite integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  inscricao_id uuid,
  credenciado_id uuid,
  credenciado_nome text,
  credenciado_cpf text,
  tipo_documento text,
  numero_documento text,
  arquivo_nome text,
  arquivo_url text,
  status text,
  data_vencimento date,
  dias_para_vencer integer,
  nivel_alerta text,
  cor_status text,
  created_at timestamp with time zone,
  ocr_resultado jsonb,
  texto_ocr text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.inscricao_id,
    dc.credenciado_id,
    c.nome AS credenciado_nome,
    c.cpf AS credenciado_cpf,
    dc.tipo_documento,
    dc.numero_documento,
    dc.arquivo_nome,
    dc.url_arquivo AS arquivo_url,
    dc.status,
    dc.data_vencimento,
    CASE 
      WHEN dc.data_vencimento IS NULL THEN NULL
      ELSE (dc.data_vencimento - CURRENT_DATE)::integer
    END AS dias_para_vencer,
    CASE
      WHEN dc.data_vencimento IS NULL THEN 'SEM_PRAZO'::text
      WHEN dc.data_vencimento < CURRENT_DATE THEN 'VENCIDO'::text
      WHEN (dc.data_vencimento - CURRENT_DATE) <= 7 THEN 'URGENTE'::text
      WHEN (dc.data_vencimento - CURRENT_DATE) <= 30 THEN 'CRITICO'::text
      WHEN (dc.data_vencimento - CURRENT_DATE) <= 60 THEN 'ATENCAO'::text
      ELSE 'VALIDO'::text
    END AS nivel_alerta,
    CASE
      WHEN dc.data_vencimento IS NULL THEN 'gray'::text
      WHEN dc.data_vencimento < CURRENT_DATE THEN 'red'::text
      WHEN (dc.data_vencimento - CURRENT_DATE) <= 7 THEN 'red'::text
      WHEN (dc.data_vencimento - CURRENT_DATE) <= 30 THEN 'orange'::text
      WHEN (dc.data_vencimento - CURRENT_DATE) <= 60 THEN 'yellow'::text
      ELSE 'green'::text
    END AS cor_status,
    dc.criado_em AS created_at,
    COALESCE(dc.metadata, '{}'::jsonb) AS ocr_resultado,
    COALESCE(dc.metadata->>'texto_extraido', '')::text AS texto_ocr
  FROM documentos_credenciados dc
  LEFT JOIN credenciados c ON c.id = dc.credenciado_id
  WHERE 
    (p_termo IS NULL OR 
      dc.tipo_documento ILIKE '%' || p_termo || '%' OR
      dc.numero_documento ILIKE '%' || p_termo || '%' OR
      c.nome ILIKE '%' || p_termo || '%' OR
      c.cpf ILIKE '%' || p_termo || '%' OR
      (dc.metadata->>'texto_extraido')::text ILIKE '%' || p_termo || '%')
    AND (p_status IS NULL OR dc.status = p_status)
    AND (p_tipo_documento IS NULL OR dc.tipo_documento = p_tipo_documento)
    AND (p_credenciado_id IS NULL OR dc.credenciado_id = p_credenciado_id)
    AND (p_inscricao_id IS NULL OR dc.inscricao_id = p_inscricao_id)
    AND (p_data_inicio IS NULL OR dc.criado_em::date >= p_data_inicio)
    AND (p_data_fim IS NULL OR dc.criado_em::date <= p_data_fim)
  ORDER BY 
    CASE WHEN p_ordenacao = 'recente' THEN dc.criado_em END DESC,
    CASE WHEN p_ordenacao = 'antigo' THEN dc.criado_em END ASC,
    CASE WHEN p_ordenacao = 'vencimento' THEN dc.data_vencimento END ASC NULLS LAST,
    CASE WHEN p_ordenacao = 'alfabetico' THEN c.nome END ASC
  LIMIT p_limite
  OFFSET p_offset;
END;
$$;