-- Primeiro, remover a constraint NOT NULL da coluna vagas
ALTER TABLE editais 
ALTER COLUMN vagas DROP NOT NULL;

-- Adicionar coluna possui_vagas na tabela editais
ALTER TABLE editais 
ADD COLUMN IF NOT EXISTS possui_vagas BOOLEAN DEFAULT false;

-- Atualizar registros existentes que têm vagas > 0
UPDATE editais 
SET possui_vagas = true 
WHERE vagas > 0;

-- Atualizar registros com vagas = 0 ou NULL para não possuir vagas
UPDATE editais 
SET possui_vagas = false, vagas = NULL
WHERE vagas = 0 OR vagas IS NULL;