-- Criar tabela de cache de validação CRM
CREATE TABLE IF NOT EXISTS public.crm_validation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm TEXT NOT NULL,
  uf TEXT NOT NULL,
  valid BOOLEAN NOT NULL,
  nome TEXT,
  situacao TEXT,
  especialidades TEXT[],
  api_response JSONB,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(crm, uf)
);

CREATE INDEX IF NOT EXISTS idx_crm_cache_lookup ON public.crm_validation_cache(crm, uf, cached_at DESC);

-- RLS
ALTER TABLE public.crm_validation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role pode gerenciar cache CRM"
  ON public.crm_validation_cache
  FOR ALL
  USING (true);

CREATE POLICY "Analistas podem consultar cache CRM"
  ON public.crm_validation_cache
  FOR SELECT
  USING (has_role(auth.uid(), 'analista'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.crm_validation_cache IS 'Cache de validações CRM via API do CFM (24h)';