-- Migration: Corrigir search_path das funções de geocoding
-- Objetivo: Garantir segurança das funções com search_path imutável

-- Recriar função normalize_address com search_path
CREATE OR REPLACE FUNCTION public.normalize_address(addr TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN LOWER(TRIM(REGEXP_REPLACE(addr, '\s+', ' ', 'g')));
END;
$$;

-- Recriar função generate_address_hash com search_path
CREATE OR REPLACE FUNCTION public.generate_address_hash(
  p_endereco TEXT,
  p_cidade TEXT,
  p_estado TEXT,
  p_cep TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
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

-- Comentários
COMMENT ON FUNCTION public.normalize_address(TEXT) IS 
  'Normaliza endereço para comparação (lowercase, trim, espaços únicos)';

COMMENT ON FUNCTION public.generate_address_hash(TEXT, TEXT, TEXT, TEXT) IS 
  'Gera hash MD5 do endereço completo normalizado para cache de geocoding';