-- Fase 1: Limpar certificados órfãos (sem documento_url)
-- Remove duplicatas mantendo apenas o mais recente por credenciado

DELETE FROM certificados
WHERE id IN (
  SELECT c1.id
  FROM certificados c1
  WHERE c1.documento_url IS NULL
    AND EXISTS (
      SELECT 1
      FROM certificados c2
      WHERE c2.credenciado_id = c1.credenciado_id
        AND c2.created_at > c1.created_at
    )
);

-- Log de limpeza
DO $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Certificados órfãos removidos: %', v_deleted_count;
END $$;