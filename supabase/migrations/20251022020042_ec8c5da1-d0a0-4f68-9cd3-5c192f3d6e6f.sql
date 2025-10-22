-- Habilitar realtime para inscricao_documentos
ALTER TABLE inscricao_documentos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE inscricao_documentos;

-- Recriar função com busca unificada em ambas as tabelas
DROP FUNCTION IF EXISTS buscar_credenciados_com_documentos_completo(
  p_termo_busca TEXT,
  p_tipo_documento TEXT,
  p_status TEXT,
  p_apenas_com_documentos BOOLEAN,
  p_apenas_vencidos BOOLEAN,
  p_limite INTEGER,
  p_offset INTEGER
);

CREATE OR REPLACE FUNCTION buscar_credenciados_com_documentos_completo(
  p_termo_busca TEXT DEFAULT NULL,
  p_tipo_documento TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
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
  especialidades JSONB,
  documentos JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH docs_filtrados AS (
    -- Documentos diretos do credenciado
    SELECT 
      dc.id,
      dc.credenciado_id,
      dc.tipo_documento,
      dc.numero_documento,
      dc.data_emissao,
      dc.data_vencimento,
      dc.arquivo_nome,
      dc.url_arquivo,
      dc.observacao,
      dc.descricao,
      dc.is_current,
      dc.status,
      dc.ocr_processado,
      CASE 
        WHEN dc.data_vencimento IS NOT NULL THEN 
          (dc.data_vencimento - CURRENT_DATE)
        ELSE NULL 
      END as dias_para_vencer,
      'credenciado'::TEXT as origem,
      CASE 
        WHEN p_termo_busca IS NOT NULL AND p_termo_busca != '' THEN
          (
            dc.tipo_documento ILIKE '%' || p_termo_busca || '%' OR
            dc.numero_documento ILIKE '%' || p_termo_busca || '%' OR
            dc.arquivo_nome ILIKE '%' || p_termo_busca || '%' OR
            dc.observacao ILIKE '%' || p_termo_busca || '%' OR
            dc.descricao ILIKE '%' || p_termo_busca || '%' OR
            (dc.ocr_resultado::TEXT ILIKE '%' || p_termo_busca || '%')
          )
        ELSE FALSE
      END as match_termo
    FROM documentos_credenciados dc
    WHERE (p_tipo_documento IS NULL OR dc.tipo_documento = p_tipo_documento)
    
    UNION ALL
    
    -- Documentos da inscrição vinculados ao credenciado
    SELECT 
      id_doc.id,
      c.id as credenciado_id,
      id_doc.tipo_documento,
      NULL::TEXT as numero_documento,
      NULL::DATE as data_emissao,
      NULL::DATE as data_vencimento,
      id_doc.arquivo_nome,
      id_doc.arquivo_url as url_arquivo,
      id_doc.observacoes as observacao,
      NULL::TEXT as descricao,
      id_doc.is_current,
      id_doc.status,
      id_doc.ocr_processado,
      NULL::INTEGER as dias_para_vencer,
      'inscricao'::TEXT as origem,
      CASE 
        WHEN p_termo_busca IS NOT NULL AND p_termo_busca != '' THEN
          (
            id_doc.tipo_documento ILIKE '%' || p_termo_busca || '%' OR
            id_doc.arquivo_nome ILIKE '%' || p_termo_busca || '%' OR
            id_doc.observacoes ILIKE '%' || p_termo_busca || '%' OR
            (id_doc.ocr_resultado::TEXT ILIKE '%' || p_termo_busca || '%')
          )
        ELSE FALSE
      END as match_termo
    FROM inscricao_documentos id_doc
    JOIN credenciados c ON c.inscricao_id = id_doc.inscricao_id
    WHERE (p_tipo_documento IS NULL OR id_doc.tipo_documento = p_tipo_documento)
  ),
  credenciados_filtrados AS (
    SELECT 
      c.id,
      c.nome,
      c.cpf,
      c.cnpj,
      c.email,
      c.status,
      c.numero_cadastro,
      ie.candidato_id
    FROM credenciados c
    LEFT JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE 
      (p_status IS NULL OR c.status = p_status)
      AND (
        p_termo_busca IS NULL 
        OR p_termo_busca = '' 
        OR c.nome ILIKE '%' || p_termo_busca || '%'
        OR c.cpf ILIKE '%' || p_termo_busca || '%'
        OR c.cnpj ILIKE '%' || p_termo_busca || '%'
        OR c.email ILIKE '%' || p_termo_busca || '%'
        OR c.numero_cadastro ILIKE '%' || p_termo_busca || '%'
      )
  ),
  docs_por_credenciado AS (
    SELECT 
      cf.id as credenciado_id,
      cf.nome as credenciado_nome,
      cf.cpf as credenciado_cpf,
      cf.cnpj as credenciado_cnpj,
      cf.email as credenciado_email,
      cf.status as credenciado_status,
      cf.numero_cadastro as credenciado_numero,
      COUNT(df.id) as total_documentos,
      COUNT(df.id) FILTER (WHERE df.is_current = TRUE AND df.status = 'aprovado') as documentos_ativos,
      COUNT(df.id) FILTER (WHERE df.dias_para_vencer < 0) as documentos_vencidos,
      COUNT(df.id) FILTER (WHERE df.dias_para_vencer >= 0 AND df.dias_para_vencer <= 30) as documentos_vencendo,
      MIN(df.data_vencimento) FILTER (WHERE df.dias_para_vencer >= 0) as proximo_vencimento,
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'crm_id', cc.id,
            'crm', cc.crm,
            'uf_crm', cc.uf_crm,
            'especialidade', cc.especialidade,
            'especialidade_id', cc.especialidade_id,
            'especialidade_nome', em.nome
          )
        ) FILTER (WHERE cc.id IS NOT NULL),
        '[]'::jsonb
      ) as especialidades,
      COALESCE(
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
            'dias_para_vencer', df.dias_para_vencer,
            'match_termo', df.match_termo,
            'origem', df.origem
          ) ORDER BY df.match_termo DESC, df.tipo_documento
        ) FILTER (WHERE df.id IS NOT NULL),
        '[]'::jsonb
      ) as docs_json
    FROM credenciados_filtrados cf
    LEFT JOIN docs_filtrados df ON df.credenciado_id = cf.id
    LEFT JOIN credenciado_crms cc ON cc.credenciado_id = cf.id
    LEFT JOIN especialidades_medicas em ON em.id = cc.especialidade_id
    GROUP BY cf.id, cf.nome, cf.cpf, cf.cnpj, cf.email, cf.status, cf.numero_cadastro
    HAVING 
      (NOT p_apenas_com_documentos OR COUNT(df.id) > 0)
      AND (NOT p_apenas_vencidos OR COUNT(df.id) FILTER (WHERE df.dias_para_vencer < 0) > 0)
  )
  SELECT 
    dpc.credenciado_id,
    dpc.credenciado_nome,
    dpc.credenciado_cpf,
    dpc.credenciado_cnpj,
    dpc.credenciado_email,
    dpc.credenciado_status,
    dpc.credenciado_numero,
    dpc.total_documentos,
    dpc.documentos_ativos,
    dpc.documentos_vencidos,
    dpc.documentos_vencendo,
    dpc.proximo_vencimento,
    dpc.especialidades,
    dpc.docs_json as documentos
  FROM docs_por_credenciado dpc
  ORDER BY 
    CASE 
      WHEN p_termo_busca IS NOT NULL AND p_termo_busca != '' THEN
        (dpc.docs_json::jsonb @> '[{"match_termo": true}]'::jsonb)::INT
      ELSE 0
    END DESC,
    dpc.credenciado_nome
  LIMIT p_limite
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;