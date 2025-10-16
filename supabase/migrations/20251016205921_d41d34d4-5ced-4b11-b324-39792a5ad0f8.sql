-- Adicionar status 'Afastado' à constraint credenciados_status_check

-- Remove constraint antiga
ALTER TABLE public.credenciados 
DROP CONSTRAINT IF EXISTS credenciados_status_check;

-- Adiciona constraint nova incluindo 'Afastado'
ALTER TABLE public.credenciados 
ADD CONSTRAINT credenciados_status_check 
CHECK (status = ANY (ARRAY[
  'Ativo'::text, 
  'Suspenso'::text, 
  'Inativo'::text, 
  'Descredenciado'::text, 
  'Aguardando Assinatura'::text,
  'Afastado'::text
]));