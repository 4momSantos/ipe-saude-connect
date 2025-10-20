-- ============================================
-- CORREÇÃO DEFINITIVA - sender_id NULLABLE
-- ============================================
-- Problema identificado nos logs:
-- "null value in column sender_id of relation workflow_messages violates not-null constraint"
-- 
-- Causa: Função sync_approved_inscricao_to_credenciado insere mensagens
-- do sistema sem sender_id, mas a coluna exige NOT NULL
--
-- Solução: Tornar sender_id nullable + constraint CHECK para validação lógica
-- ============================================

-- 1. Remover constraint NOT NULL de sender_id
ALTER TABLE workflow_messages 
ALTER COLUMN sender_id DROP NOT NULL;

-- 2. Remover constraint antiga se existir
ALTER TABLE workflow_messages
DROP CONSTRAINT IF EXISTS workflow_messages_sender_check;

-- 3. Adicionar constraint CHECK para validação inteligente
ALTER TABLE workflow_messages
ADD CONSTRAINT workflow_messages_sender_check
CHECK (
  -- Sistema: sender_id DEVE ser NULL
  (sender_type = 'sistema' AND sender_id IS NULL) 
  OR 
  -- Usuários (candidato, analista, gestor): sender_id DEVE existir
  (sender_type IN ('candidato', 'analista', 'gestor') AND sender_id IS NOT NULL)
);

-- 4. Corrigir mensagens existentes do sistema (se houver com sender_id incorreto)
UPDATE workflow_messages
SET sender_id = NULL
WHERE sender_type = 'sistema' AND sender_id IS NOT NULL;

-- 5. Adicionar comentários de documentação
COMMENT ON COLUMN workflow_messages.sender_id IS 
'UUID do usuário que enviou a mensagem. NULL quando sender_type = sistema (mensagens automáticas do sistema).';

COMMENT ON CONSTRAINT workflow_messages_sender_check ON workflow_messages IS 
'Garante que mensagens do sistema não tenham sender_id (NULL), mas mensagens de usuários DEVEM ter sender_id preenchido.';

-- ============================================
-- VERIFICAÇÃO PÓS-MIGRATION
-- ============================================
-- Execute esta query após aplicar para verificar:
-- 
-- SELECT 
--   sender_type,
--   COUNT(*) as total,
--   COUNT(sender_id) as com_sender_id,
--   COUNT(*) - COUNT(sender_id) as sem_sender_id
-- FROM workflow_messages
-- GROUP BY sender_type
-- ORDER BY sender_type;
--
-- Esperado:
-- sistema    | X | 0 | X  (todas sem sender_id)
-- candidato  | X | X | 0  (todas com sender_id)
-- analista   | X | X | 0  (todas com sender_id)
-- gestor     | X | X | 0  (todas com sender_id)
-- ============================================