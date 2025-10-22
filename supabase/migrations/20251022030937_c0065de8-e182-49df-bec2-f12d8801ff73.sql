-- Corrigir UNION de tabelas com estruturas diferentes
DROP FUNCTION IF EXISTS buscar_credenciados_com_documentos_completo CASCADE;

CREATE OR REPLACE FUNCTION buscar_credenciados_com_documentos_completo(
  p_termo_busca TEXT DEFAULT NULL,
  p_tipo_documento TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_apenas_com_documentos BOOLEAN DEFAULT false,
  p_apenas_vencidos BOOLEAN DEFAULT false,
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
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE NOTICE '[RPC] Iniciando busca - termo: %, tipo_doc: %, status: %', p_termo_busca, p_tipo_documento, p_status;
  
  RETURN QUERY
  WITH credenciados_filtrados AS (
    SELECT 
      c.id,
      c.nome,
      c.cpf,
      c.cnpj,
      c.email,
      c.status,
      c.numero_credenciado,
      c.inscricao_id
    FROM credenciados c
    WHERE 
      (p_status IS NULL OR c.status = p_status)
      AND (
        p_termo_busca IS NULL 
        OR c.nome ILIKE '%' || p_termo_busca || '%'
        OR c.cpf ILIKE '%' || p_termo_busca || '%'
        OR c.cnpj ILIKE '%' || p_termo_busca || '%'
        OR c.email ILIKE '%' || p_termo_busca || '%'
        OR c.numero_credenciado ILIKE '%' || p_termo_busca || '%'
      )
  ),
  docs_unificados AS (
    -- Documentos do credenciado
    SELECT 
      dc.credenciado_id,
      dc.id,
      'credenciado'::TEXT as origem,
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
      COALESCE(dc.ocr_processado, false) as ocr_processado,
      CASE 
        WHEN dc.data_vencimento IS NOT NULL THEN (dc.data_vencimento - CURRENT_DATE)
        ELSE NULL 
      END as dias_para_vencer
    FROM documentos_credenciados dc
    INNER JOIN credenciados_filtrados cf ON cf.id = dc.credenciado_id
    WHERE dc.is_current = true
    
    UNION ALL
    
    -- Documentos da inscrição (mapear colunas diferentes e usar NULL para as que não existem)
    SELECT 
      cf.id as credenciado_id,
      id.id,
      'inscricao'::TEXT as origem,
      id.tipo_documento,
      NULL::TEXT as numero_documento,  -- ❌ Coluna não existe
      NULL::DATE as data_emissao,      -- ❌ Coluna não existe
      NULL::DATE as data_vencimento,   -- ❌ Coluna não existe
      id.arquivo_nome,
      id.arquivo_url as url_arquivo,   -- ✅ Mapeamento diferente
      id.observacoes as observacao,    -- ✅ Mapeamento diferente
      NULL::TEXT as descricao,         -- ❌ Coluna não existe
      true as is_current,              -- ❌ Coluna não existe (sempre current)
      id.status,
      COALESCE(id.ocr_processado, false) as ocr_processado,
      NULL::INTEGER as dias_para_vencer  -- ❌ Sem data de vencimento
    FROM inscricao_documentos id
    INNER JOIN credenciados_filtrados cf ON cf.inscricao_id = id.inscricao_id
  ),
  docs_por_credenciado AS (
    SELECT
      cf.id as credenciado_id,
      cf.nome as credenciado_nome,
      cf.cpf as credenciado_cpf,
      cf.cnpj as credenciado_cnpj,
      cf.email as credenciado_email,
      cf.status as credenciado_status,
      cf.numero_credenciado as credenciado_numero,
      COUNT(du.id) as total_documentos,
      COUNT(du.id) FILTER (WHERE du.status = 'ativo') as documentos_ativos,
      COUNT(du.id) FILTER (WHERE du.dias_para_vencer < 0) as documentos_vencidos,
      COUNT(du.id) FILTER (WHERE du.dias_para_vencer >= 0 AND du.dias_para_vencer <= 30) as documentos_vencendo,
      MIN(du.data_vencimento) FILTER (WHERE du.data_vencimento >= CURRENT_DATE) as proximo_vencimento,
      COALESCE(
        jsonb_agg(
          DISTINCT jsonb_build_object(
            'crm_id', cc.id,
            'crm', cc.crm,
            'uf_crm', cc.uf_crm,
            'especialidade', cc.especialidade,
            'especialidade_id', cc.especialidade_id,
            'especialidade_nome', e.nome
          )
        ) FILTER (WHERE cc.id IS NOT NULL),
        '[]'::jsonb
      ) as especialidades,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', du.id,
            'origem', du.origem,
            'tipo_documento', du.tipo_documento,
            'numero_documento', du.numero_documento,
            'data_emissao', du.data_emissao,
            'data_vencimento', du.data_vencimento,
            'arquivo_nome', du.arquivo_nome,
            'url_arquivo', du.url_arquivo,
            'observacao', du.observacao,
            'descricao', du.descricao,
            'is_current', du.is_current,
            'status', du.status,
            'ocr_processado', du.ocr_processado,
            'dias_para_vencer', du.dias_para_vencer,
            'match_termo', (
              p_termo_busca IS NULL 
              OR du.tipo_documento ILIKE '%' || p_termo_busca || '%'
              OR du.numero_documento ILIKE '%' || p_termo_busca || '%'
              OR du.descricao ILIKE '%' || p_termo_busca || '%'
            )
          )
          ORDER BY 
            CASE WHEN du.dias_para_vencer IS NOT NULL AND du.dias_para_vencer < 0 THEN 0 ELSE 1 END,
            du.dias_para_vencer ASC NULLS LAST,
            du.data_vencimento ASC NULLS LAST
        ) FILTER (WHERE du.id IS NOT NULL),
        '[]'::jsonb
      ) as documentos
    FROM credenciados_filtrados cf
    LEFT JOIN docs_unificados du ON du.credenciado_id = cf.id
      AND (p_tipo_documento IS NULL OR du.tipo_documento = p_tipo_documento)
      AND (
        NOT p_apenas_vencidos 
        OR du.dias_para_vencer < 0
      )
    LEFT JOIN credenciado_crms cc ON cc.credenciado_id = cf.id
    LEFT JOIN especialidades e ON e.id = cc.especialidade_id
    GROUP BY cf.id, cf.nome, cf.cpf, cf.cnpj, cf.email, cf.status, cf.numero_credenciado
    HAVING 
      NOT p_apenas_com_documentos 
      OR COUNT(du.id) > 0
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
    dpc.documentos
  FROM docs_por_credenciado dpc
  ORDER BY 
    dpc.credenciado_nome
  LIMIT p_limite
  OFFSET p_offset;
  
END;
$$;

COMMENT ON FUNCTION buscar_credenciados_com_documentos_completo IS 
'Busca credenciados e seus documentos unificados de duas fontes: documentos_credenciados e inscricao_documentos. Lida com diferenças de estrutura entre as tabelas.';