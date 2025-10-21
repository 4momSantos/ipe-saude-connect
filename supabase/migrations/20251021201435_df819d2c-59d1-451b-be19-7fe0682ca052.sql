-- Corrigir função RPC para retornar os nomes de colunas corretos
CREATE OR REPLACE FUNCTION calcular_estatisticas_hibridas(p_credenciado_id UUID)
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
AS $$
DECLARE
  v_nota_publica NUMERIC;
  v_count_publica BIGINT;
  v_nota_interna NUMERIC;
  v_count_interna BIGINT;
  v_performance_score NUMERIC;
BEGIN
  -- Calcular dados públicos
  SELECT 
    COALESCE(AVG(ap.nota_estrelas), 0),
    COUNT(ap.id)
  INTO v_nota_publica, v_count_publica
  FROM avaliacoes_publicas ap
  WHERE ap.credenciado_id = p_credenciado_id
    AND ap.status = 'aprovada';
  
  -- Calcular dados internos
  SELECT 
    COALESCE(AVG(avp.pontuacao_geral), 0),
    COUNT(avp.id)
  INTO v_nota_interna, v_count_interna
  FROM avaliacoes_prestadores avp
  WHERE avp.credenciado_id = p_credenciado_id
    AND avp.status = 'finalizada';
  
  -- Calcular performance score híbrido (60% pública + 40% interna)
  v_performance_score := CASE 
    WHEN v_count_publica > 0 AND v_count_interna > 0 THEN
      (v_nota_publica * 0.6) + (v_nota_interna * 0.4)
    WHEN v_count_publica > 0 THEN v_nota_publica
    WHEN v_count_interna > 0 THEN v_nota_interna
    ELSE 0
  END;
  
  RETURN QUERY
  SELECT 
    v_nota_publica AS nota_media_publica,
    v_count_publica AS total_avaliacoes_publicas,
    v_nota_interna AS nota_media_interna,
    v_count_interna AS total_avaliacoes_internas,
    v_performance_score AS performance_score,
    -- Análise de critérios
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'nome', elem->>'criterio_nome',
          'media', AVG((elem->>'pontuacao')::NUMERIC)
        )
      )
      FROM avaliacoes_prestadores avp2,
      jsonb_array_elements(avp2.criterios) AS elem
      WHERE avp2.credenciado_id = p_credenciado_id
        AND avp2.status = 'finalizada'
      GROUP BY elem->>'criterio_nome'
      ORDER BY AVG((elem->>'pontuacao')::NUMERIC) DESC
    ) AS criterios_destaque,
    -- Pontos fortes
    ARRAY(
      SELECT DISTINCT pontos_positivos
      FROM avaliacoes_prestadores
      WHERE credenciado_id = p_credenciado_id
        AND pontos_positivos IS NOT NULL
        AND pontos_positivos != ''
      LIMIT 5
    ) AS pontos_fortes,
    -- Pontos fracos
    ARRAY(
      SELECT DISTINCT pontos_melhoria
      FROM avaliacoes_prestadores
      WHERE credenciado_id = p_credenciado_id
        AND pontos_melhoria IS NOT NULL
        AND pontos_melhoria != ''
      LIMIT 5
    ) AS pontos_fracos,
    -- Badges baseados em critérios híbridos
    ARRAY(
      SELECT badge FROM (
        SELECT 
          CASE 
            WHEN v_nota_publica >= 4.5 AND v_count_publica >= 10 THEN 'top_rated_publico'
            WHEN v_nota_interna >= 4.5 AND v_count_interna >= 3 THEN 'excelencia_interna'
            WHEN v_performance_score >= 4.7 AND v_count_publica > 0 AND v_count_interna > 0 THEN 'elite_performer'
          END AS badge
      ) sub
      WHERE badge IS NOT NULL
    ) AS badges;
END;
$$;