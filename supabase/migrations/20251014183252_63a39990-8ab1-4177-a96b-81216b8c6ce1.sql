-- Criar tabela de cidades
CREATE TABLE IF NOT EXISTS public.cidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  uf VARCHAR(2) NOT NULL,
  populacao_total INTEGER NOT NULL,
  latitude_centro DECIMAL(10, 8) NOT NULL,
  longitude_centro DECIMAL(11, 8) NOT NULL,
  zoom_padrao INTEGER DEFAULT 11,
  ativa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT cidades_nome_uf_unique UNIQUE (nome, uf)
);

-- Criar tabela de zonas geográficas
CREATE TABLE IF NOT EXISTS public.zonas_geograficas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cidade_id UUID NOT NULL REFERENCES public.cidades(id) ON DELETE CASCADE,
  zona VARCHAR(100) NOT NULL,
  cidade VARCHAR(100) NOT NULL,
  estado VARCHAR(2) NOT NULL,
  populacao INTEGER NOT NULL,
  area_km2 DECIMAL(10, 2) DEFAULT 0,
  geometry JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT zonas_cidade_zona_unique UNIQUE (cidade_id, zona)
);

-- Adicionar colunas de cidade e zona aos credenciados (se não existirem)
ALTER TABLE public.credenciados 
ADD COLUMN IF NOT EXISTS cidade_id UUID REFERENCES public.cidades(id),
ADD COLUMN IF NOT EXISTS zona_id UUID REFERENCES public.zonas_geograficas(id);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_zonas_cidade_id ON public.zonas_geograficas(cidade_id);
CREATE INDEX IF NOT EXISTS idx_credenciados_cidade_id ON public.credenciados(cidade_id);
CREATE INDEX IF NOT EXISTS idx_credenciados_zona_id ON public.credenciados(zona_id);
CREATE INDEX IF NOT EXISTS idx_cidades_ativa ON public.cidades(ativa);

-- Habilitar RLS
ALTER TABLE public.cidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zonas_geograficas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cidades (todos podem ler cidades ativas)
CREATE POLICY "Todos podem ver cidades ativas" ON public.cidades
  FOR SELECT USING (ativa = true);

CREATE POLICY "Gestores podem gerenciar cidades" ON public.cidades
  FOR ALL USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Políticas RLS para zonas (todos podem ler)
CREATE POLICY "Todos podem ver zonas" ON public.zonas_geograficas
  FOR SELECT USING (true);

CREATE POLICY "Gestores podem gerenciar zonas" ON public.zonas_geograficas
  FOR ALL USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Inserir 3 cidades
INSERT INTO public.cidades (nome, uf, populacao_total, latitude_centro, longitude_centro, zoom_padrao, ativa) 
VALUES
  ('Recife', 'PE', 1653461, -8.0476, -34.8770, 11, true),
  ('Porto Alegre', 'RS', 1492530, -30.0346, -51.2177, 11, true),
  ('São Paulo', 'SP', 12325232, -23.5505, -46.6333, 10, true)
ON CONFLICT (nome, uf) DO NOTHING;

-- Inserir zonas para Recife
INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Norte',
  'Recife',
  'PE',
  400000,
  45.5,
  '{"type":"Polygon","coordinates":[[[-34.95,-8.00],[-34.85,-8.00],[-34.85,-8.05],[-34.95,-8.05],[-34.95,-8.00]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'Recife' AND c.uf = 'PE'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Sul',
  'Recife',
  'PE',
  350000,
  38.2,
  '{"type":"Polygon","coordinates":[[[-34.92,-8.10],[-34.88,-8.10],[-34.88,-8.15],[-34.92,-8.15],[-34.92,-8.10]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'Recife' AND c.uf = 'PE'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Centro',
  'Recife',
  'PE',
  150000,
  12.8,
  '{"type":"Polygon","coordinates":[[[-34.90,-8.05],[-34.86,-8.05],[-34.86,-8.08],[-34.90,-8.08],[-34.90,-8.05]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'Recife' AND c.uf = 'PE'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Oeste',
  'Recife',
  'PE',
  250000,
  32.4,
  '{"type":"Polygon","coordinates":[[[-34.98,-8.03],[-34.93,-8.03],[-34.93,-8.09],[-34.98,-8.09],[-34.98,-8.03]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'Recife' AND c.uf = 'PE'
ON CONFLICT (cidade_id, zona) DO NOTHING;

-- Inserir zonas para Porto Alegre
INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Centro Histórico',
  'Porto Alegre',
  'RS',
  180000,
  15.3,
  '{"type":"Polygon","coordinates":[[[-51.24,-30.02],[-51.20,-30.02],[-51.20,-30.04],[-51.24,-30.04],[-51.24,-30.02]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'Porto Alegre' AND c.uf = 'RS'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Zona Norte',
  'Porto Alegre',
  'RS',
  320000,
  42.7,
  '{"type":"Polygon","coordinates":[[[-51.25,-29.98],[-51.18,-29.98],[-51.18,-30.02],[-51.25,-30.02],[-51.25,-29.98]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'Porto Alegre' AND c.uf = 'RS'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Zona Sul',
  'Porto Alegre',
  'RS',
  450000,
  68.5,
  '{"type":"Polygon","coordinates":[[[-51.25,-30.04],[-51.18,-30.04],[-51.18,-30.10],[-51.25,-30.10],[-51.25,-30.04]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'Porto Alegre' AND c.uf = 'RS'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Zona Leste',
  'Porto Alegre',
  'RS',
  280000,
  38.9,
  '{"type":"Polygon","coordinates":[[[-51.18,-30.00],[-51.12,-30.00],[-51.12,-30.06],[-51.18,-30.06],[-51.18,-30.00]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'Porto Alegre' AND c.uf = 'RS'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Zona Oeste',
  'Porto Alegre',
  'RS',
  262530,
  51.2,
  '{"type":"Polygon","coordinates":[[[-51.32,-30.00],[-51.25,-30.00],[-51.25,-30.06],[-51.32,-30.06],[-51.32,-30.00]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'Porto Alegre' AND c.uf = 'RS'
ON CONFLICT (cidade_id, zona) DO NOTHING;

-- Inserir zonas para São Paulo
INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Centro',
  'São Paulo',
  'SP',
  800000,
  26.2,
  '{"type":"Polygon","coordinates":[[[-46.66,-23.54],[-46.62,-23.54],[-46.62,-23.56],[-46.66,-23.56],[-46.66,-23.54]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'São Paulo' AND c.uf = 'SP'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Zona Norte',
  'São Paulo',
  'SP',
  2500000,
  295.8,
  '{"type":"Polygon","coordinates":[[[-46.70,-23.45],[-46.58,-23.45],[-46.58,-23.53],[-46.70,-23.53],[-46.70,-23.45]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'São Paulo' AND c.uf = 'SP'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Zona Sul',
  'São Paulo',
  'SP',
  3200000,
  624.3,
  '{"type":"Polygon","coordinates":[[[-46.70,-23.56],[-46.58,-23.56],[-46.58,-23.70],[-46.70,-23.70],[-46.70,-23.56]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'São Paulo' AND c.uf = 'SP'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Zona Leste',
  'São Paulo',
  'SP',
  3800000,
  334.7,
  '{"type":"Polygon","coordinates":[[[-46.58,-23.50],[-46.40,-23.50],[-46.40,-23.62],[-46.58,-23.62],[-46.58,-23.50]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'São Paulo' AND c.uf = 'SP'
ON CONFLICT (cidade_id, zona) DO NOTHING;

INSERT INTO public.zonas_geograficas (cidade_id, zona, cidade, estado, populacao, area_km2, geometry)
SELECT 
  c.id,
  'Zona Oeste',
  'São Paulo',
  'SP',
  2025232,
  270.5,
  '{"type":"Polygon","coordinates":[[[-46.80,-23.50],[-46.66,-23.50],[-46.66,-23.62],[-46.80,-23.62],[-46.80,-23.50]]]}'::jsonb
FROM public.cidades c WHERE c.nome = 'São Paulo' AND c.uf = 'SP'
ON CONFLICT (cidade_id, zona) DO NOTHING;

-- Atualizar credenciados existentes para Recife (se não tiverem cidade)
UPDATE public.credenciados 
SET cidade_id = (SELECT id FROM public.cidades WHERE nome = 'Recife' AND uf = 'PE')
WHERE cidade_id IS NULL AND (cidade = 'Recife' OR estado = 'PE');

-- Criar função para detectar zona por coordenadas
CREATE OR REPLACE FUNCTION public.detectar_zona(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_cidade_id UUID
) RETURNS UUID AS $$
DECLARE
  v_zona_id UUID;
BEGIN
  -- Algoritmo simplificado de ray-casting para polígonos
  -- Para cada zona da cidade, verifica se o ponto está dentro
  SELECT z.id INTO v_zona_id
  FROM public.zonas_geograficas z
  WHERE z.cidade_id = p_cidade_id
    AND ST_Contains(
      ST_GeomFromGeoJSON(z.geometry::text),
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
    )
  LIMIT 1;
  
  RETURN v_zona_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Se não encontrar ou der erro, retorna NULL
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;