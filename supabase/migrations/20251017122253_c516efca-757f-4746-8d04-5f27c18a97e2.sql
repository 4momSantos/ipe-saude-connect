-- Migration: Adicionar campo tipo_credenciamento

-- Adicionar campo tipo_credenciamento (nullable para retrocompatibilidade)
ALTER TABLE public.inscricoes_edital 
ADD COLUMN IF NOT EXISTS tipo_credenciamento VARCHAR(2) CHECK (tipo_credenciamento IN ('PF', 'PJ'));

-- Comentário para documentação
COMMENT ON COLUMN public.inscricoes_edital.tipo_credenciamento IS 
'Tipo de credenciamento: PF (Pessoa Física) ou PJ (Pessoa Jurídica)';

-- Atualizar inscrições antigas (tentar inferir tipo baseado em dados)
UPDATE public.inscricoes_edital 
SET tipo_credenciamento = CASE 
  WHEN dados_inscricao->'pessoa_juridica'->>'cnpj' IS NOT NULL THEN 'PJ'
  WHEN dados_inscricao->'dados_pessoais'->>'cpf' IS NOT NULL THEN 'PF'
  ELSE 'PF' -- Default para inscrições sem dados claros
END
WHERE tipo_credenciamento IS NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_inscricoes_tipo_credenciamento 
ON public.inscricoes_edital(tipo_credenciamento);

-- Adicionar tipo_credenciamento em credenciados
ALTER TABLE public.credenciados 
ADD COLUMN IF NOT EXISTS tipo_credenciamento VARCHAR(2) CHECK (tipo_credenciamento IN ('PF', 'PJ'));

-- Atualizar credenciados existentes baseado em dados
UPDATE public.credenciados 
SET tipo_credenciamento = CASE 
  WHEN cnpj IS NOT NULL THEN 'PJ'
  WHEN cpf IS NOT NULL THEN 'PF'
  ELSE 'PF'
END
WHERE tipo_credenciamento IS NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_credenciados_tipo 
ON public.credenciados(tipo_credenciamento);

COMMENT ON COLUMN public.credenciados.tipo_credenciamento IS 
'Tipo: PF (Pessoa Física) ou PJ (Pessoa Jurídica)';