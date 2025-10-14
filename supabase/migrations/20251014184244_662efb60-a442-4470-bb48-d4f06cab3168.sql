-- Adicionar metadados de geometria às zonas
ALTER TABLE zonas_geograficas
ADD COLUMN IF NOT EXISTS geometria_fonte VARCHAR(100),
ADD COLUMN IF NOT EXISTS geometria_atualizada_em TIMESTAMP,
ADD COLUMN IF NOT EXISTS distritos_inclusos TEXT[],
ADD COLUMN IF NOT EXISTS ibge_codigo VARCHAR(20),
ADD COLUMN IF NOT EXISTS osm_id BIGINT,
ADD COLUMN IF NOT EXISTS geometry_simplified JSONB;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_zonas_geometria_fonte 
  ON zonas_geograficas(geometria_fonte);

CREATE INDEX IF NOT EXISTS idx_zonas_atualizada_em 
  ON zonas_geograficas(geometria_atualizada_em);

-- Comentários
COMMENT ON COLUMN zonas_geograficas.geometria_fonte IS 
  'Fonte da geometria: IBGE, OpenStreetMap, GeoSampa, Manual';

COMMENT ON COLUMN zonas_geograficas.distritos_inclusos IS 
  'Lista de bairros/distritos oficiais que compõem esta zona';

COMMENT ON COLUMN zonas_geograficas.geometry_simplified IS 
  'Versão simplificada da geometria para performance no mapa';