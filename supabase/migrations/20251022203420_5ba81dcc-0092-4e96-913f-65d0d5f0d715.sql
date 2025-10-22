-- ============================================
-- CORREÇÃO: calcular_estatisticas_hibridas
-- Problema: Coluna 'nota' não existe, usar 'nota_estrelas'
-- ============================================

CREATE OR REPLACE FUNCTION public.calcular_estatisticas_hibridas(p_credenciado_id UUID)
RETURNS TABLE (
  nota_media_publica NUMERIC,
  total_avaliacoes_publicas BIGINT,
  nota_media_interna NUMERIC,
  total_avaliacoes_internas BIGINT,
  performance_score NUMERIC,
  criterios_destaque JSONB,
  pontos_fortes TEXT[],
  pontos_fracos TEXT[],
  badges TEXT[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH 
    -- CTE 1: Avaliações Públicas (1 scan otimizado) - CORRIGIDO: nota_estrelas
    avaliacoes_pub AS (
      SELECT 
        COALESCE(ROUND(AVG(nota_estrelas)::NUMERIC, 1), 0) as media_pub,
        COUNT(*)::BIGINT as total_pub
      FROM avaliacoes_publicas
      WHERE credenciado_id = p_credenciado_id
        AND status = 'aprovada'
    ),
    
    -- CTE 2: Base Internas (1 scan com índice)
    avaliacoes_int_base AS (
      SELECT 
        nota_geral,
        criterios,
        pontos_positivos,
        pontos_melhoria
      FROM avaliacoes_prestadores
      WHERE credenciado_id = p_credenciado_id
        AND status = 'finalizada'
    ),
    
    -- CTE 3: Métricas Internas
    avaliacoes_int_metricas AS (
      SELECT 
        COALESCE(ROUND(AVG(nota_geral)::NUMERIC, 1), 0) as media_int,
        COUNT(*)::BIGINT as total_int
      FROM avaliacoes_int_base
    ),
    
    -- CTE 4: Pontos Fortes (CORRIGIDO: TEXT ao invés de TEXT[])
    pontos_fortes_flat AS (
      SELECT DISTINCT pontos_positivos as ponto
      FROM avaliacoes_int_base
      WHERE pontos_positivos IS NOT NULL 
        AND trim(pontos_positivos) != ''
      LIMIT 5
    ),
    
    -- CTE 5: Pontos Fracos (CORRIGIDO: TEXT ao invés de TEXT[])
    pontos_fracos_flat AS (
      SELECT DISTINCT pontos_melhoria as ponto
      FROM avaliacoes_int_base
      WHERE pontos_melhoria IS NOT NULL 
        AND trim(pontos_melhoria) != ''
      LIMIT 5
    ),
    
    -- CTE 6: Agregar Arrays
    pontos_agregados AS (
      SELECT 
        COALESCE(array_agg(pf.ponto ORDER BY pf.ponto), ARRAY[]::TEXT[]) as fortes,
        COALESCE(array_agg(pfw.ponto ORDER BY pfw.ponto), ARRAY[]::TEXT[]) as fracos
      FROM (SELECT 1) dummy
      LEFT JOIN pontos_fortes_flat pf ON true
      LEFT JOIN pontos_fracos_flat pfw ON true
    ),
    
    -- CTE 7: Critérios (1 scan com GIN index)
    criterios_calc AS (
      SELECT 
        CASE 
          WHEN COUNT(*) > 0 THEN
            jsonb_agg(
              jsonb_build_object(
                'nome', crit.key,
                'media', ROUND(AVG((crit.value::TEXT)::NUMERIC), 1)
              )
              ORDER BY AVG((crit.value::TEXT)::NUMERIC) DESC
            )
          ELSE NULL
        END as criterios_json
      FROM avaliacoes_int_base,
           jsonb_each(criterios) as crit
      WHERE criterios IS NOT NULL
      GROUP BY crit.key
    ),
    
    -- CTE 8: Performance Score
    performance_calc AS (
      SELECT 
        pub.media_pub,
        pub.total_pub,
        int_m.media_int,
        int_m.total_int,
        CASE 
          WHEN int_m.total_int > 0 AND pub.total_pub > 0 THEN
            ROUND(
              (int_m.media_int * 0.7 + pub.media_pub * 0.3)::NUMERIC,
              1
            )
          WHEN int_m.total_int > 0 THEN int_m.media_int
          WHEN pub.total_pub > 0 THEN pub.media_pub
          ELSE NULL
        END as perf_score
      FROM avaliacoes_pub pub
      CROSS JOIN avaliacoes_int_metricas int_m
    ),
    
    -- CTE 9: Badges
    badges_calc AS (
      SELECT 
        CASE 
          WHEN perf.perf_score >= 4.5 THEN ARRAY['excelencia']::TEXT[]
          WHEN perf.perf_score >= 4.0 THEN ARRAY['destaque']::TEXT[]
          WHEN perf.total_pub >= 50 THEN ARRAY['popular']::TEXT[]
          ELSE ARRAY[]::TEXT[]
        END as badges_array
      FROM performance_calc perf
    )
  
  -- SELECT FINAL: Join de todos os CTEs
  SELECT 
    perf.media_pub::NUMERIC,
    perf.total_pub::BIGINT,
    perf.media_int::NUMERIC,
    perf.total_int::BIGINT,
    perf.perf_score::NUMERIC,
    crit.criterios_json::JSONB,
    pts.fortes::TEXT[],
    pts.fracos::TEXT[],
    bdg.badges_array::TEXT[]
  FROM performance_calc perf
  CROSS JOIN pontos_agregados pts
  CROSS JOIN criterios_calc crit
  CROSS JOIN badges_calc bdg;
END;
$$;