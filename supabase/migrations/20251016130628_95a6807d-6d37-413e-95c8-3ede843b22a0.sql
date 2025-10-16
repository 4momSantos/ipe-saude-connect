-- Adicionar campo numero_credenciado à tabela credenciados
ALTER TABLE public.credenciados 
ADD COLUMN numero_credenciado TEXT UNIQUE;

-- Criar sequência para gerar números únicos
CREATE SEQUENCE IF NOT EXISTS numero_credenciado_seq START 1000;

-- Função para gerar número do credenciado automaticamente
CREATE OR REPLACE FUNCTION generate_numero_credenciado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.numero_credenciado IS NULL THEN
    NEW.numero_credenciado := 'CRED-' || LPAD(nextval('numero_credenciado_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar numero_credenciado automaticamente
DROP TRIGGER IF EXISTS set_numero_credenciado ON public.credenciados;
CREATE TRIGGER set_numero_credenciado
  BEFORE INSERT ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION generate_numero_credenciado();

-- Atualizar credenciados existentes que não têm número
UPDATE public.credenciados
SET numero_credenciado = 'CRED-' || LPAD(nextval('numero_credenciado_seq')::TEXT, 6, '0')
WHERE numero_credenciado IS NULL;