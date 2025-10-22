-- ==========================================
-- Migration: Fix RPC v3.1 - Schema Correto
-- Data: 2025-10-22
-- Corrige tabelas e colunas inexistentes
-- ==========================================

-- 1. REMOVER VERSÃO ANTIGA
DROP FUNCTION IF EXISTS buscar_credenciados_com_documentos_completo(
  TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER
) CASCADE;

-- 2. CRIAR FUNÇÃO COM SCHEMA REAL
CREATE OR REPLACE FUNCTION buscar_credenciados_com_documentos_completo(
  p_termo_busca TEXT DEFAULT NULL,
  p_tipo_documento TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_apenas_com_documentos BOOLEAN DEFAULT false,
  p_apenas_vencidos BOOLEAN DEFAULT false,
  p_limite INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
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
  -- VALIDAÇÕES
  IF p_limite IS NOT NULL AND p_limite < 0 THEN
    RAISE EXCEPTION 'p_limite deve ser >= 0';
  END IF;
  
  IF p_offset IS NOT NULL AND p_offset < 0 THEN
    RAISE EXCEPTION 'p_offset deve ser >= 0';
  END IF;

  RAISE NOTICE '[RPC v3.1] Buscando com termo: %, tipo_doc: %', p_termo_busca, p_tipo_documento;

  RETURN QUERY
  WITH documentos_unificados AS (
    -- Documentos de credenciados (schema real)
    SELECT 
      dc.id,
      dc.credenciado_id,
      'credenciado'::TEXT AS origem,
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
          (dc.data_vencimento - CURRENT_DATE)::INTEGER
        ELSE NULL 
      END AS dias_para_vencer
    FROM documentos_credenciados dc
    
    UNION ALL
    
    -- Documentos de inscrições (schema real - colunas diferentes!)
    SELECT
      id.id,
      c.id AS credenciado_id, -- JOIN com credenciados via inscricao_id
      'inscricao'::TEXT AS origem,
      id.tipo_documento,
      CAST(NULL AS TEXT) AS numero_documento, -- inscricao_documentos não tem
      CAST(NULL AS DATE) AS data_emissao,     -- inscricao_documentos não tem
      CAST(NULL AS DATE) AS data_vencimento,  -- inscricao_documentos não tem
      id.arquivo_nome,
      id.arquivo_url AS url_arquivo,
      id.observacoes AS observacao,
      CAST(NULL AS TEXT) AS descricao,
      id.is_current,
      id.status,
      id.ocr_processado,
      CAST(NULL AS INTEGER) AS dias_para_vencer
    FROM inscricao_documentos id
    JOIN credenciados c ON c.inscricao_id = id.inscricao_id
  ),
  credenciados_agregados AS (
    SELECT 
      c.id AS credenciado_id,
      c.nome AS credenciado_nome,
      c.cpf AS credenciado_cpf,
      c.cnpj AS credenciado_cnpj,
      c.email AS credenciado_email,
      c.status AS credenciado_status,
      c.numero_credenciado AS credenciado_numero,
      COUNT(du.id) AS total_documentos,
      COUNT(du.id) FILTER (WHERE du.is_current = true AND du.status = 'ativo') AS documentos_ativos,
      COUNT(du.id) FILTER (WHERE du.dias_para_vencer < 0) AS documentos_vencidos,
      COUNT(du.id) FILTER (WHERE du.dias_para_vencer BETWEEN 0 AND 30) AS documentos_vencendo,
      MIN(du.data_vencimento) FILTER (WHERE du.data_vencimento >= CURRENT_DATE) AS proximo_vencimento,
      
      -- Especialidades (usando credenciado_crms - tabela real)
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'crm_id', crm.id,
              'crm', crm.crm,
              'uf_crm', crm.uf_crm,
              'especialidade', crm.especialidade,
              'especialidade_id', crm.especialidade_id,
              'especialidade_nome', em.nome
            )
          )
          FROM credenciado_crms crm
          LEFT JOIN especialidades_medicas em ON em.id = crm.especialidade_id
          WHERE crm.credenciado_id = c.id
        ),
        '[]'::jsonb
      ) AS especialidades,
      
      -- Documentos agregados
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
            'match_termo', CASE 
              WHEN p_tipo_documento IS NOT NULL THEN 
                (du.tipo_documento ILIKE '%' || p_tipo_documento || '%')
              ELSE false 
            END
          ) ORDER BY du.data_vencimento DESC NULLS LAST
        ) FILTER (WHERE du.id IS NOT NULL),
        '[]'::jsonb
      ) AS documentos
    FROM credenciados c
    LEFT JOIN documentos_unificados du ON du.credenciado_id = c.id
    WHERE 
      -- Filtro de busca (nome, cpf, cnpj, email, numero)
      (p_termo_busca IS NULL OR 
       c.nome ILIKE '%' || p_termo_busca || '%' OR 
       c.cpf ILIKE '%' || p_termo_busca || '%' OR
       c.cnpj ILIKE '%' || p_termo_busca || '%' OR
       c.email ILIKE '%' || p_termo_busca || '%' OR
       c.numero_credenciado ILIKE '%' || p_termo_busca || '%')
      -- Filtro de status
      AND (p_status IS NULL OR c.status = p_status)
    GROUP BY c.id, c.nome, c.cpf, c.cnpj, c.email, c.status, c.numero_credenciado
    HAVING 
      -- Apenas com documentos
      (NOT p_apenas_com_documentos OR COUNT(du.id) > 0)
      -- Apenas vencidos
      AND (NOT p_apenas_vencidos OR COUNT(du.id) FILTER (WHERE du.dias_para_vencer < 0) > 0)
      -- Tipo de documento
      AND (p_tipo_documento IS NULL OR COUNT(du.id) FILTER (WHERE du.tipo_documento ILIKE '%' || p_tipo_documento || '%') > 0)
  )
  SELECT * FROM credenciados_agregados
  ORDER BY credenciado_nome
  LIMIT COALESCE(p_limite, 50)
  OFFSET COALESCE(p_offset, 0);
END;
$$;

-- 3. PERMISSÕES
GRANT EXECUTE ON FUNCTION buscar_credenciados_com_documentos_completo 
TO authenticated, anon, service_role;

-- 4. COMENTÁRIO
COMMENT ON FUNCTION buscar_credenciados_com_documentos_completo IS 
'v3.1.0 - Corrigido para usar schema real: credenciado_crms, especialidades_medicas, documentos_credenciados, inscricao_documentos (2025-10-22)';

-- 5. TESTE RÁPIDO
DO $$
BEGIN
  PERFORM * FROM buscar_credenciados_com_documentos_completo(NULL, NULL, NULL, false, false, 5, 0);
  RAISE NOTICE '✅ Função v3.1 testada com sucesso!';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION '❌ Teste falhou: %', SQLERRM;
END $$;