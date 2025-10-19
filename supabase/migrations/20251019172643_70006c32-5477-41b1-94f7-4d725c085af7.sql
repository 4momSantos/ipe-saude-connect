-- Adicionar campo responsável técnico em profissionais_credenciados
ALTER TABLE profissionais_credenciados 
ADD COLUMN IF NOT EXISTS responsavel_tecnico BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profissionais_credenciados.responsavel_tecnico IS 
'Indica se o profissional é Responsável Técnico do estabelecimento';