-- Migration: Criar tabela de consultórios da inscrição

-- Tabela para múltiplos consultórios durante o processo de inscrição
CREATE TABLE IF NOT EXISTS public.inscricao_consultorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes_edital(id) ON DELETE CASCADE,
  
  -- Identificação do consultório
  nome_consultorio VARCHAR(255),
  cnes VARCHAR(20),
  telefone VARCHAR(20),
  ramal VARCHAR(10),
  
  -- Endereço completo
  cep VARCHAR(9),
  logradouro VARCHAR(255),
  numero VARCHAR(10),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  
  -- Responsável Técnico (obrigatório para PJ)
  responsavel_tecnico_nome VARCHAR(255),
  responsavel_tecnico_crm VARCHAR(20),
  responsavel_tecnico_uf VARCHAR(2),
  
  -- Especialidades oferecidas neste consultório
  especialidades_ids UUID[] DEFAULT '{}',
  
  -- Horários de atendimento (JSONB para flexibilidade)
  horarios JSONB DEFAULT '[]'::jsonb,
  
  -- Flags de controle
  is_principal BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT unique_cnes_per_inscricao UNIQUE(inscricao_id, cnes)
);

-- RLS Policies
ALTER TABLE public.inscricao_consultorios ENABLE ROW LEVEL SECURITY;

-- Candidatos podem ver/editar consultórios de suas inscrições
DROP POLICY IF EXISTS "Candidatos gerenciam seus consultórios" ON public.inscricao_consultorios;
CREATE POLICY "Candidatos gerenciam seus consultórios"
ON public.inscricao_consultorios
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inscricoes_edital ie
    WHERE ie.id = inscricao_consultorios.inscricao_id
    AND ie.candidato_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.inscricoes_edital ie
    WHERE ie.id = inscricao_consultorios.inscricao_id
    AND ie.candidato_id = auth.uid()
  )
);

-- Gestores/analistas podem ver todos
DROP POLICY IF EXISTS "Gestores veem todos consultórios" ON public.inscricao_consultorios;
CREATE POLICY "Gestores veem todos consultórios"
ON public.inscricao_consultorios
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'analista'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Sistema pode criar consultórios
DROP POLICY IF EXISTS "Sistema pode criar consultórios" ON public.inscricao_consultorios;
CREATE POLICY "Sistema pode criar consultórios"
ON public.inscricao_consultorios
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_inscricao_consultorios_inscricao 
ON public.inscricao_consultorios(inscricao_id);

CREATE INDEX IF NOT EXISTS idx_inscricao_consultorios_cnes 
ON public.inscricao_consultorios(cnes);

CREATE INDEX IF NOT EXISTS idx_inscricao_consultorios_principal 
ON public.inscricao_consultorios(inscricao_id, is_principal) 
WHERE is_principal = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_inscricao_consultorios_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_inscricao_consultorios_updated_at ON public.inscricao_consultorios;
CREATE TRIGGER update_inscricao_consultorios_updated_at
BEFORE UPDATE ON public.inscricao_consultorios
FOR EACH ROW EXECUTE FUNCTION public.update_inscricao_consultorios_updated_at();

-- Comentários
COMMENT ON TABLE public.inscricao_consultorios IS 
'Consultórios cadastrados durante o processo de inscrição (PF=1, PJ=múltiplos)';