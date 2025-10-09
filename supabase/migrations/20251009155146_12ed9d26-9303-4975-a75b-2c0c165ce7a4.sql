-- Migration: Adicionar controle de tentativas de geocodificação
-- Objetivo: Evitar reprocessamento infinito de endereços que falharam

-- Adicionar coluna geocode_attempts se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'credenciados' 
    AND column_name = 'geocode_attempts'
  ) THEN
    ALTER TABLE public.credenciados 
    ADD COLUMN geocode_attempts INTEGER DEFAULT 0;
    
    COMMENT ON COLUMN public.credenciados.geocode_attempts IS 
      'Número de tentativas de geocodificação realizadas (máximo 5)';
  END IF;
END $$;

-- Adicionar índice para otimizar busca de credenciados pendentes
CREATE INDEX IF NOT EXISTS idx_credenciados_geocode_pending 
ON public.credenciados (geocode_attempts) 
WHERE latitude IS NULL AND endereco IS NOT NULL;

-- Comentários
COMMENT ON INDEX idx_credenciados_geocode_pending IS 
  'Otimiza busca de credenciados que precisam ser geocodificados';

-- Adicionar coluna last_geocode_attempt se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'credenciados' 
    AND column_name = 'last_geocode_attempt'
  ) THEN
    ALTER TABLE public.credenciados 
    ADD COLUMN last_geocode_attempt TIMESTAMPTZ NULL;
    
    COMMENT ON COLUMN public.credenciados.last_geocode_attempt IS 
      'Timestamp da última tentativa de geocodificação';
  END IF;
END $$;