-- Criar função para marcar mensagens como lidas por usuário
CREATE OR REPLACE FUNCTION mark_messages_read(
  message_ids UUID[],
  user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE workflow_messages
  SET 
    lido_por = CASE 
      WHEN lido_por IS NULL THEN jsonb_build_array(user_id)
      WHEN NOT (lido_por @> jsonb_build_array(user_id)) 
        THEN lido_por || jsonb_build_array(user_id)
      ELSE lido_por
    END,
    read_at = CASE 
      WHEN read_at IS NULL THEN NOW()
      ELSE read_at
    END
  WHERE id = ANY(message_ids)
    AND (lido_por IS NULL OR NOT (lido_por @> jsonb_build_array(user_id)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Inicializar lido_por como array vazio para mensagens existentes
UPDATE workflow_messages
SET lido_por = '[]'::jsonb
WHERE lido_por IS NULL;

-- Criar índice GIN para performance em consultas de lido_por
CREATE INDEX IF NOT EXISTS idx_workflow_messages_lido_por 
ON workflow_messages USING GIN (lido_por);

-- Comentário explicativo
COMMENT ON FUNCTION mark_messages_read IS 'Marca mensagens como lidas para um usuário específico, adicionando o user_id ao array lido_por';
COMMENT ON COLUMN workflow_messages.lido_por IS 'Array JSONB de UUIDs dos usuários que leram a mensagem';