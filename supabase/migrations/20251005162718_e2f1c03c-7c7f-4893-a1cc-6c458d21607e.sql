-- Etapa 3: Adicionar status 'pendente_workflow' à tabela inscricoes_edital
-- Permitir que inscrições fiquem marcadas quando workflow falha ao vincular

-- Comentar que o status pode incluir 'pendente_workflow'
COMMENT ON COLUMN inscricoes_edital.status IS 
'Status da inscrição: rascunho, em_analise, aprovado, reprovado, inabilitado, pendente_workflow';

-- Nota: Se o tipo for ENUM no futuro, adicionar: ALTER TYPE inscricao_status ADD VALUE 'pendente_workflow';