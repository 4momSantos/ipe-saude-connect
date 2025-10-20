-- Adicionar colunas faltantes na tabela analises para suportar decisões detalhadas
ALTER TABLE analises 
ADD COLUMN IF NOT EXISTS campos_reprovados JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS documentos_reprovados JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS prazo_correcao TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Criar índice para melhor performance em buscas por prazo de correção
CREATE INDEX IF NOT EXISTS idx_analises_prazo_correcao 
ON analises(prazo_correcao) 
WHERE prazo_correcao IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN analises.campos_reprovados IS 'Array de campos reprovados com justificativas detalhadas';
COMMENT ON COLUMN analises.documentos_reprovados IS 'Array de documentos reprovados com ações requeridas';
COMMENT ON COLUMN analises.prazo_correcao IS 'Data limite para correção quando status = pendente_correcao';