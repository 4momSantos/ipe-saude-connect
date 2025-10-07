-- Sprint 1: Adicionar campo formularios_vinculados e tornar workflow obrigatório

-- 1. Adicionar coluna para armazenar IDs dos formulários vinculados
ALTER TABLE editais 
ADD COLUMN IF NOT EXISTS formularios_vinculados jsonb DEFAULT '[]'::jsonb;

-- 2. Criar índice para otimizar consultas por workflow
CREATE INDEX IF NOT EXISTS idx_editais_workflow_id 
ON editais(workflow_id) 
WHERE workflow_id IS NOT NULL;

-- 3. Criar índice GIN para buscas nos formulários vinculados
CREATE INDEX IF NOT EXISTS idx_editais_formularios_vinculados 
ON editais USING GIN(formularios_vinculados);

-- 4. Adicionar comentários para documentação
COMMENT ON COLUMN editais.formularios_vinculados IS 
'Array de UUIDs dos formulários (form_templates) extraídos dos nós "form" do workflow vinculado. Exemplo: ["uuid1", "uuid2"]';

COMMENT ON COLUMN editais.workflow_id IS 
'UUID do workflow vinculado. Obrigatório para processar inscrições automaticamente.';