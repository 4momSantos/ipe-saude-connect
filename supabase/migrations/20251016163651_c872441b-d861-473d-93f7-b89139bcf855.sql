-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Leitura pública de credenciados ativos com localização" ON credenciados;
DROP POLICY IF EXISTS "Leitura pública de CRMs de credenciados ativos" ON credenciado_crms;
DROP POLICY IF EXISTS "Leitura pública de categorias de credenciados ativos" ON credenciado_categorias;

-- Policy para leitura pública de credenciados ativos com localização
CREATE POLICY "Leitura pública de credenciados ativos com localização"
ON credenciados FOR SELECT
TO anon, authenticated
USING (
  status = 'Ativo' 
  AND latitude IS NOT NULL 
  AND longitude IS NOT NULL
);

-- Policy para leitura pública de CRMs de credenciados ativos
CREATE POLICY "Leitura pública de CRMs de credenciados ativos"
ON credenciado_crms FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM credenciados c
    WHERE c.id = credenciado_crms.credenciado_id
    AND c.status = 'Ativo'
    AND c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
  )
);

-- Policy para leitura pública de categorias de credenciados ativos
CREATE POLICY "Leitura pública de categorias de credenciados ativos"
ON credenciado_categorias FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM credenciados c
    WHERE c.id = credenciado_categorias.credenciado_id
    AND c.status = 'Ativo'
    AND c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
  )
);