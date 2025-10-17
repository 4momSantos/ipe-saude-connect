-- Restauração: Normalizar edital híbrido e adicionar constraint anti-híbrido

-- 1. Normalizar edital 003/2025 (e8f42b11-d49c-4c49-8f4e-823d961b39c1)
UPDATE editais
SET 
  workflow_id = NULL,
  workflow_version = NULL,
  use_programmatic_flow = true
WHERE id = 'e8f42b11-d49c-4c49-8f4e-823d961b39c1';

-- 2. Adicionar constraint para bloquear híbridos futuros
ALTER TABLE editais
ADD CONSTRAINT chk_no_hybrid_processing
  CHECK (NOT (use_programmatic_flow = true AND workflow_id IS NOT NULL));

-- 3. Comentários para rastreabilidade
COMMENT ON CONSTRAINT chk_no_hybrid_processing ON editais IS 
  'Previne estado híbrido: use_programmatic_flow=true E workflow_id IS NOT NULL';
