-- Tornar analise_id opcional na tabela contratos
ALTER TABLE public.contratos 
ALTER COLUMN analise_id DROP NOT NULL;