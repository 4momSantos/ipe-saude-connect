-- Garantir que o bucket certificados-regularidade existe e é público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificados-regularidade',
  'certificados-regularidade',
  true,
  5242880, -- 5MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) 
DO UPDATE SET 
  public = true,
  allowed_mime_types = ARRAY['application/pdf'];

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura pública de certificados" ON storage.objects;
DROP POLICY IF EXISTS "Service role pode fazer upload" ON storage.objects;
DROP POLICY IF EXISTS "Service role pode atualizar certificados" ON storage.objects;

-- Política: Permitir leitura pública de certificados
CREATE POLICY "Permitir leitura pública de certificados"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificados-regularidade');

-- Política: Service role pode fazer upload
CREATE POLICY "Service role pode fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificados-regularidade' 
  AND (auth.role() = 'service_role' OR auth.role() = 'authenticated')
);

-- Política: Service role pode atualizar
CREATE POLICY "Service role pode atualizar certificados"
ON storage.objects FOR UPDATE
USING (bucket_id = 'certificados-regularidade')
WITH CHECK (bucket_id = 'certificados-regularidade');