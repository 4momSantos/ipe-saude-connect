-- Migration: Criar tabela de consultórios do credenciado

-- Tabela para consultórios de credenciados aprovados
CREATE TABLE IF NOT EXISTS public.credenciado_consultorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  
  -- Referência à inscrição original (para auditoria)
  inscricao_consultorio_id UUID REFERENCES public.inscricao_consultorios(id) ON DELETE SET NULL,
  
  -- Cópia dos dados (manter histórico mesmo se inscrição for deletada)
  nome_consultorio VARCHAR(255) NOT NULL,
  cnes VARCHAR(20) NOT NULL,
  telefone VARCHAR(20),
  ramal VARCHAR(10),
  
  -- Endereço
  cep VARCHAR(9),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  
  -- Responsável Técnico
  responsavel_tecnico_nome VARCHAR(255),
  responsavel_tecnico_crm VARCHAR(20),
  responsavel_tecnico_uf VARCHAR(2),
  
  -- Especialidades e horários (cópia)
  especialidades_ids UUID[] DEFAULT '{}',
  horarios JSONB DEFAULT '[]'::jsonb,
  
  -- Localização geográfica (será preenchida por geocoding)
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geocoded_at TIMESTAMPTZ,
  
  -- Flags
  is_principal BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_cnes_per_credenciado UNIQUE(credenciado_id, cnes)
);

-- RLS Policies
ALTER TABLE public.credenciado_consultorios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Credenciados veem seus consultórios" ON public.credenciado_consultorios;
CREATE POLICY "Credenciados veem seus consultórios"
ON public.credenciado_consultorios
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.credenciados c
    JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = credenciado_consultorios.credenciado_id
    AND ie.candidato_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Gestores gerenciam consultórios" ON public.credenciado_consultorios;
CREATE POLICY "Gestores gerenciam consultórios"
ON public.credenciado_consultorios
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Leitura pública de consultórios ativos" ON public.credenciado_consultorios;
CREATE POLICY "Leitura pública de consultórios ativos"
ON public.credenciado_consultorios
FOR SELECT
USING (
  ativo = true AND 
  EXISTS (
    SELECT 1 FROM public.credenciados c
    WHERE c.id = credenciado_consultorios.credenciado_id
    AND c.status = 'Ativo'
  )
);

DROP POLICY IF EXISTS "Sistema pode criar consultórios de credenciados" ON public.credenciado_consultorios;
CREATE POLICY "Sistema pode criar consultórios de credenciados"
ON public.credenciado_consultorios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_credenciado_consultorios_credenciado 
ON public.credenciado_consultorios(credenciado_id);

CREATE INDEX IF NOT EXISTS idx_credenciado_consultorios_location 
ON public.credenciado_consultorios(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Comentários
COMMENT ON TABLE public.credenciado_consultorios IS 
'Consultórios de credenciados aprovados (cópia dos dados da inscrição)';