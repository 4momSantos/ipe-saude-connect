-- =============================================
-- FASE 6: OBSERVABILIDADE & MONITORAMENTO
-- Views para estatísticas e métricas de geocoding
-- =============================================

-- View 1: Estatísticas gerais de geocodificação
CREATE OR REPLACE VIEW view_credenciados_geo_stats AS
SELECT 
  COUNT(*) as total_credenciados,
  COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as total_geocoded,
  COUNT(CASE WHEN latitude IS NULL AND endereco IS NOT NULL THEN 1 END) as total_missing_geo,
  COUNT(CASE WHEN geocode_attempts >= 3 THEN 1 END) as total_max_attempts_reached,
  
  -- Tempo médio para geocodificar (em horas)
  ROUND(AVG(EXTRACT(EPOCH FROM (geocoded_at - created_at)) / 3600), 2) as avg_hours_to_geocode,
  
  -- Taxa de sucesso
  ROUND(
    100.0 * COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as success_rate_percent,
  
  -- Credenciados criados nas últimas 24h
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as created_last_24h,
  COUNT(CASE WHEN geocoded_at > NOW() - INTERVAL '24 hours' THEN 1 END) as geocoded_last_24h,
  
  -- Performance
  MIN(geocoded_at) as first_geocoded_at,
  MAX(geocoded_at) as last_geocoded_at
FROM credenciados
WHERE status = 'Ativo';

COMMENT ON VIEW view_credenciados_geo_stats IS 
'Estatísticas gerais de geocodificação de credenciados ativos';

-- View 2: Falhas de geocodificação nas últimas 24h
CREATE OR REPLACE VIEW view_geocode_failures_last_24h AS
SELECT 
  c.id,
  c.nome,
  c.endereco,
  c.cidade,
  c.estado,
  c.cep,
  c.geocode_attempts,
  c.last_geocode_attempt,
  c.created_at,
  EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600 as hours_since_creation
FROM credenciados c
WHERE c.status = 'Ativo'
  AND c.latitude IS NULL
  AND c.endereco IS NOT NULL
  AND (
    c.last_geocode_attempt > NOW() - INTERVAL '24 hours'
    OR c.created_at > NOW() - INTERVAL '24 hours'
  )
ORDER BY c.geocode_attempts DESC, c.created_at DESC;

COMMENT ON VIEW view_geocode_failures_last_24h IS 
'Credenciados com falhas de geocodificação nas últimas 24 horas';

-- View 3: Cache hit rate
CREATE OR REPLACE VIEW view_geocode_cache_stats AS
SELECT 
  COUNT(*) as total_cache_entries,
  COUNT(CASE WHEN hit_count > 1 THEN 1 END) as reused_entries,
  SUM(hit_count) as total_hits,
  ROUND(AVG(hit_count), 2) as avg_hits_per_entry,
  MAX(hit_count) as max_hits,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as entries_last_week,
  COUNT(CASE WHEN last_used_at > NOW() - INTERVAL '24 hours' THEN 1 END) as used_last_24h,
  ROUND(
    100.0 * COUNT(CASE WHEN hit_count > 1 THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as cache_reuse_rate_percent
FROM geocode_cache;

COMMENT ON VIEW view_geocode_cache_stats IS 
'Estatísticas de performance e reuso do cache de geocodificação';

-- View 4: Distribuição geográfica
CREATE OR REPLACE VIEW view_geocode_distribution AS
SELECT 
  c.estado,
  COUNT(*) as total,
  COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as geocoded,
  COUNT(CASE WHEN latitude IS NULL THEN 1 END) as missing,
  ROUND(
    100.0 * COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) / 
    NULLIF(COUNT(*), 0), 
    2
  ) as success_rate
FROM credenciados c
WHERE c.status = 'Ativo'
GROUP BY c.estado
ORDER BY total DESC;

COMMENT ON VIEW view_geocode_distribution IS 
'Distribuição de geocodificação por estado';

-- Função para detectar alertas de geocoding
CREATE OR REPLACE FUNCTION check_geocoding_alerts()
RETURNS TABLE(
  alert_type TEXT,
  severity TEXT,
  message TEXT,
  count BIGINT,
  details JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_missing_24h BIGINT;
  v_consecutive_fails BIGINT;
BEGIN
  -- Alert 1: Mais de 50 credenciados sem geocoding por 24h
  SELECT COUNT(*) INTO v_missing_24h
  FROM credenciados
  WHERE status = 'Ativo'
    AND latitude IS NULL
    AND endereco IS NOT NULL
    AND created_at < NOW() - INTERVAL '24 hours';
  
  IF v_missing_24h > 50 THEN
    RETURN QUERY SELECT 
      'MISSING_GEOCODING'::TEXT,
      'HIGH'::TEXT,
      format('Há %s credenciados sem geocodificação há mais de 24 horas', v_missing_24h),
      v_missing_24h,
      jsonb_build_object(
        'threshold', 50,
        'actual', v_missing_24h,
        'action', 'Executar backfill de geocodificação'
      );
  END IF;
  
  -- Alert 2: Credenciados com tentativas máximas atingidas
  SELECT COUNT(*) INTO v_consecutive_fails
  FROM credenciados
  WHERE status = 'Ativo'
    AND latitude IS NULL
    AND geocode_attempts >= 3;
  
  IF v_consecutive_fails > 5 THEN
    RETURN QUERY SELECT 
      'MAX_ATTEMPTS_REACHED'::TEXT,
      'MEDIUM'::TEXT,
      format('%s credenciados atingiram o limite máximo de tentativas', v_consecutive_fails),
      v_consecutive_fails,
      jsonb_build_object(
        'threshold', 5,
        'actual', v_consecutive_fails,
        'action', 'Verificar qualidade dos endereços e configuração do provider'
      );
  END IF;
  
  -- Alert 3: Taxa de sucesso baixa nas últimas 24h
  DECLARE
    v_success_rate NUMERIC;
  BEGIN
    SELECT 
      ROUND(
        100.0 * COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) / 
        NULLIF(COUNT(*), 0), 
        2
      )
    INTO v_success_rate
    FROM credenciados
    WHERE created_at > NOW() - INTERVAL '24 hours';
    
    IF v_success_rate < 80 AND v_success_rate IS NOT NULL THEN
      RETURN QUERY SELECT 
        'LOW_SUCCESS_RATE'::TEXT,
        'MEDIUM'::TEXT,
        format('Taxa de sucesso de geocodificação está em %.2f%% nas últimas 24h', v_success_rate),
        NULL::BIGINT,
        jsonb_build_object(
          'threshold', 80,
          'actual', v_success_rate,
          'action', 'Investigar causas de falha e considerar provider alternativo'
        );
    END IF;
  END;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION check_geocoding_alerts() IS 
'Verifica condições de alerta relacionadas à geocodificação';

-- Grant permissions
GRANT SELECT ON view_credenciados_geo_stats TO authenticated;
GRANT SELECT ON view_geocode_failures_last_24h TO authenticated;
GRANT SELECT ON view_geocode_cache_stats TO authenticated;
GRANT SELECT ON view_geocode_distribution TO authenticated;
GRANT EXECUTE ON FUNCTION check_geocoding_alerts() TO authenticated;