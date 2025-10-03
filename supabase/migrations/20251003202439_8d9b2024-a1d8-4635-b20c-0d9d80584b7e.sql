-- Make edital_id NOT NULL and add unique constraint to prevent duplicate inscriptions
ALTER TABLE public.inscricoes_edital
  ALTER COLUMN edital_id SET NOT NULL;

-- Add unique constraint to prevent duplicate inscriptions for same user and edital
ALTER TABLE public.inscricoes_edital
  ADD CONSTRAINT unique_candidato_edital UNIQUE (candidato_id, edital_id);