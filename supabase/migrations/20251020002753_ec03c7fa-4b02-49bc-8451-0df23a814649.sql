-- Remover constraint existente sem ON DELETE CASCADE
ALTER TABLE controle_prazos 
DROP CONSTRAINT IF EXISTS controle_prazos_credenciado_id_fkey;

-- Recriar constraint com ON DELETE CASCADE
-- Quando um credenciado for deletado, seus prazos serão automaticamente deletados
ALTER TABLE controle_prazos 
ADD CONSTRAINT controle_prazos_credenciado_id_fkey 
FOREIGN KEY (credenciado_id) 
REFERENCES credenciados(id) 
ON DELETE CASCADE;

-- Comentário para documentação
COMMENT ON CONSTRAINT controle_prazos_credenciado_id_fkey ON controle_prazos IS 
'Cascade delete: quando credenciado é deletado, seus prazos também são removidos automaticamente';