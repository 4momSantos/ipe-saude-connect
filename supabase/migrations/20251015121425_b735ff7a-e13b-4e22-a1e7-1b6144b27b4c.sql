-- ============================================
-- FASE 1: Adicionar tipos de manifestações formais
-- ============================================

-- Adicionar novos valores ao campo tipo da tabela workflow_messages
-- Os tipos formais são: parecer, decisao, justificativa, observacao_formal
COMMENT ON COLUMN workflow_messages.tipo IS 'Tipo da mensagem: comentario, sistema, parecer, decisao, justificativa, observacao_formal';

-- Criar índice para buscas por tipo formal
CREATE INDEX IF NOT EXISTS idx_messages_tipo_formal 
ON workflow_messages(tipo) 
WHERE tipo IN ('parecer', 'decisao', 'justificativa', 'observacao_formal');

-- Adicionar coluna para metadata de manifestações
ALTER TABLE workflow_messages 
ADD COLUMN IF NOT EXISTS manifestacao_metadata jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN workflow_messages.manifestacao_metadata IS 'Metadata adicional para manifestações formais: categoria, impacto, prazo_resposta, requer_aprovacao';

-- Criar índice GIN para buscar por metadata
CREATE INDEX IF NOT EXISTS idx_messages_manifestacao_metadata 
ON workflow_messages USING gin(manifestacao_metadata);

-- ============================================
-- RLS Policies para manifestações formais
-- ============================================

-- Gestores, admins e analistas podem criar manifestações formais
CREATE POLICY "Gestores podem criar manifestações formais"
ON workflow_messages
FOR INSERT
TO authenticated
WITH CHECK (
  tipo IN ('parecer', 'decisao', 'justificativa', 'observacao_formal') AND
  (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'gestor') OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'analista')
  )
);

-- Manifestações formais são visíveis para todos os envolvidos no processo
CREATE POLICY "Manifestações formais visíveis para todos"
ON workflow_messages
FOR SELECT
TO authenticated
USING (
  tipo IN ('parecer', 'decisao', 'justificativa', 'observacao_formal') AND
  (
    'todos' = ANY(visivel_para) OR
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role::text = ANY(visivel_para)
    )
  )
);