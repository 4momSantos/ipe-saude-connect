-- Adicionar suporte a geocoding (corrigido)

-- Adicionar colunas de geolocalização
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'credenciados' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE public.credenciados ADD COLUMN latitude DOUBLE PRECISION NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'credenciados' 
    AND column_name = 'longitude'
  ) THEN
    ALTER TABLE public.credenciados ADD COLUMN longitude DOUBLE PRECISION NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'credenciados' 
    AND column_name = 'geocoded_at'
  ) THEN
    ALTER TABLE public.credenciados ADD COLUMN geocoded_at TIMESTAMPTZ NULL;
  END IF;
END $$;

-- Constraints de validação (sem IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credenciados_latitude_valid') THEN
    ALTER TABLE public.credenciados 
    ADD CONSTRAINT credenciados_latitude_valid 
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credenciados_longitude_valid') THEN
    ALTER TABLE public.credenciados 
    ADD CONSTRAINT credenciados_longitude_valid 
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'credenciados_latlon_together') THEN
    ALTER TABLE public.credenciados 
    ADD CONSTRAINT credenciados_latlon_together 
    CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL));
  END IF;
END $$;

-- Tabela de cache de geocoding
CREATE TABLE IF NOT EXISTS public.geocode_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address_hash TEXT NOT NULL UNIQUE,
  address_text TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  provider TEXT NOT NULL DEFAULT 'nominatim',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now(),
  hit_count INTEGER DEFAULT 1,
  CONSTRAINT geocode_cache_latitude_valid CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT geocode_cache_longitude_valid CHECK (longitude >= -180 AND longitude <= 180)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_credenciados_latlon 
ON public.credenciados (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_geocode_cache_address_hash 
ON public.geocode_cache (address_hash);

-- Funções auxiliares
CREATE OR REPLACE FUNCTION public.normalize_address(addr TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(addr, '\s+', ' ', 'g')));
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_address_hash(
  p_endereco TEXT,
  p_cidade TEXT,
  p_estado TEXT,
  p_cep TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_full_address TEXT;
BEGIN
  v_full_address := CONCAT_WS(', ',
    normalize_address(COALESCE(p_endereco, '')),
    normalize_address(COALESCE(p_cidade, '')),
    normalize_address(COALESCE(p_estado, '')),
    normalize_address(COALESCE(p_cep, ''))
  );
  RETURN md5(v_full_address);
END;
$$;

-- RLS na tabela de cache
ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários autenticados podem ler cache" ON public.geocode_cache;
CREATE POLICY "Usuários autenticados podem ler cache"
ON public.geocode_cache FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Service role pode gerenciar cache" ON public.geocode_cache;
CREATE POLICY "Service role pode gerenciar cache"
ON public.geocode_cache FOR ALL TO service_role USING (true) WITH CHECK (true);