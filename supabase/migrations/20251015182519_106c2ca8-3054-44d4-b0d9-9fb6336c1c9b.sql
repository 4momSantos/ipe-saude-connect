-- Adicionar colunas faltantes na tabela profissionais_credenciados
ALTER TABLE public.profissionais_credenciados
ADD COLUMN IF NOT EXISTS celular TEXT,
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS data_nascimento DATE;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.profissionais_credenciados.celular IS 'Número de celular do profissional';
COMMENT ON COLUMN public.profissionais_credenciados.rg IS 'Registro Geral (RG) do profissional';
COMMENT ON COLUMN public.profissionais_credenciados.data_nascimento IS 'Data de nascimento do profissional';