-- Tabela para chat integrado ao workflow
CREATE TABLE workflow_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  inscricao_id UUID REFERENCES inscricoes_edital(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('analista', 'candidato', 'sistema')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_workflow_messages_execution ON workflow_messages(execution_id);
CREATE INDEX idx_workflow_messages_inscricao ON workflow_messages(inscricao_id);
CREATE INDEX idx_workflow_messages_unread ON workflow_messages(is_read) WHERE NOT is_read;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_workflow_messages_updated_at
BEFORE UPDATE ON workflow_messages
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE workflow_messages ENABLE ROW LEVEL SECURITY;

-- Candidatos e analistas podem ver mensagens de suas inscrições
CREATE POLICY "Ver mensagens da inscrição"
ON workflow_messages FOR SELECT
USING (
  sender_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM inscricoes_edital ie
    WHERE ie.id = workflow_messages.inscricao_id
    AND (ie.candidato_id = auth.uid() OR ie.analisado_por = auth.uid())
  )
);

-- Usuários autenticados podem enviar mensagens
CREATE POLICY "Enviar mensagens"
ON workflow_messages FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- Usuários podem marcar suas mensagens como lidas
CREATE POLICY "Marcar como lida"
ON workflow_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM inscricoes_edital ie
    WHERE ie.id = workflow_messages.inscricao_id
    AND (ie.candidato_id = auth.uid() OR ie.analisado_por = auth.uid())
  )
);

-- Adicionar tabela à publicação realtime
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_messages;