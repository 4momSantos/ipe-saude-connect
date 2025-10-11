-- FASE 1: Adicionar campo max_especialidades na tabela editais
ALTER TABLE public.editais 
ADD COLUMN IF NOT EXISTS max_especialidades INTEGER DEFAULT 5;

COMMENT ON COLUMN public.editais.max_especialidades IS 'Número máximo de especialidades permitidas por inscrição';

-- Atualizar editais existentes
UPDATE public.editais 
SET max_especialidades = 5 
WHERE max_especialidades IS NULL;