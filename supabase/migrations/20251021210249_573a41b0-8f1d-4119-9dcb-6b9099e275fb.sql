
-- Corrigir mensagens com usuario_nome/usuario_email NULL
-- Buscar dados dos perfis e atualizar as mensagens

UPDATE workflow_messages wm
SET 
  usuario_nome = COALESCE(p.nome, p.email),
  usuario_email = p.email
FROM profiles p
WHERE wm.sender_id = p.id
  AND (wm.usuario_nome IS NULL OR wm.usuario_email IS NULL)
  AND wm.sender_id IS NOT NULL;
