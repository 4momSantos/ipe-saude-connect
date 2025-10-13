-- Criar sequence para protocolo
CREATE SEQUENCE IF NOT EXISTS protocolo_inscricao_seq START 1;

-- Função para gerar protocolo único
CREATE OR REPLACE FUNCTION gerar_protocolo_inscricao()
RETURNS text AS $$
DECLARE
  ano text;
  numero text;
BEGIN
  ano := EXTRACT(YEAR FROM NOW())::text;
  numero := LPAD(nextval('protocolo_inscricao_seq')::text, 5, '0');
  RETURN 'IPE-' || ano || '-' || numero;
END;
$$ LANGUAGE plpgsql;

-- Adicionar coluna protocolo na tabela inscricoes_edital
ALTER TABLE inscricoes_edital 
ADD COLUMN IF NOT EXISTS protocolo text UNIQUE;

-- Criar trigger para gerar protocolo automaticamente
CREATE OR REPLACE FUNCTION trigger_gerar_protocolo()
RETURNS trigger AS $$
BEGIN
  IF NEW.protocolo IS NULL THEN
    NEW.protocolo := gerar_protocolo_inscricao();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Adicionar trigger se não existir
DROP TRIGGER IF EXISTS set_protocolo_inscricao ON inscricoes_edital;
CREATE TRIGGER set_protocolo_inscricao
BEFORE INSERT ON inscricoes_edital
FOR EACH ROW
EXECUTE FUNCTION trigger_gerar_protocolo();

-- Gerar protocolos para inscrições existentes sem protocolo
UPDATE inscricoes_edital
SET protocolo = gerar_protocolo_inscricao()
WHERE protocolo IS NULL;