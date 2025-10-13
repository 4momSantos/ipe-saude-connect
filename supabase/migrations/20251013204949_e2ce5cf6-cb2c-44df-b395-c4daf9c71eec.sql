-- Adicionar coluna inscricao_id à tabela signature_requests
ALTER TABLE public.signature_requests 
ADD COLUMN IF NOT EXISTS inscricao_id UUID;

-- Adicionar foreign key para inscricoes_edital
ALTER TABLE public.signature_requests
ADD CONSTRAINT fk_signature_requests_inscricao
FOREIGN KEY (inscricao_id) 
REFERENCES public.inscricoes_edital(id)
ON DELETE SET NULL;

-- Criar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_signature_requests_inscricao_id 
ON public.signature_requests(inscricao_id);

-- Atualizar registros existentes com inscricao_id quando possível
UPDATE public.signature_requests sr
SET inscricao_id = c.inscricao_id
FROM public.contratos c
WHERE sr.contrato_id = c.id
  AND sr.inscricao_id IS NULL;