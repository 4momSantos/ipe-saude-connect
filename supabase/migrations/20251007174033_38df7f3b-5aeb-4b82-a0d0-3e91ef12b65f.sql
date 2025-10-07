-- Sprint 4: Adicionar campos para separar anexos administrativos e de processo

-- Adicionar novas colunas
ALTER TABLE public.editais
ADD COLUMN IF NOT EXISTS anexos_administrativos jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS anexos_processo_esperados jsonb DEFAULT '[]'::jsonb;

-- Migrar dados existentes de anexos para anexos_administrativos
UPDATE public.editais
SET anexos_administrativos = COALESCE(anexos, '[]'::jsonb)
WHERE anexos_administrativos = '[]'::jsonb;

-- Adicionar índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_editais_anexos_processo 
ON public.editais USING gin (anexos_processo_esperados);

-- Comentários
COMMENT ON COLUMN public.editais.anexos_administrativos IS 'Anexos gerais do edital (PDF, minuta, planilha)';
COMMENT ON COLUMN public.editais.anexos_processo_esperados IS 'Anexos esperados do processo de credenciamento (herdados dos formulários do workflow)';