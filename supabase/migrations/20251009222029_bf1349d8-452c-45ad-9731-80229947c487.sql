-- Storage Bucket para Certificados Digitais
-- Bucket público com políticas de segurança

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificados',
  'certificados',
  true,
  5242880, -- 5MB limit
  ARRAY['application/pdf']
);

-- RLS Policies para o bucket certificados
CREATE POLICY "Certificados são públicos para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificados');

CREATE POLICY "Sistema pode criar certificados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificados' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Sistema pode atualizar certificados"
ON storage.objects FOR UPDATE
USING (bucket_id = 'certificados')
WITH CHECK (bucket_id = 'certificados');