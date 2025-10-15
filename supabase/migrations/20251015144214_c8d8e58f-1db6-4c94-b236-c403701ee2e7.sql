-- FASE 5 (Corrigida): Criar bucket e políticas de storage

-- Criar bucket se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados-regularidade', 'certificados-regularidade', true)
ON CONFLICT (id) DO NOTHING;

-- Dropar políticas antigas se existirem
DROP POLICY IF EXISTS "Certificados são públicos para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Sistema pode criar certificados" ON storage.objects;
DROP POLICY IF EXISTS "Sistema pode atualizar certificados" ON storage.objects;

-- Permitir leitura pública dos PDFs
CREATE POLICY "Certificados são públicos para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'certificados-regularidade');

-- Apenas service role pode inserir/atualizar
CREATE POLICY "Sistema pode criar certificados"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'certificados-regularidade');

CREATE POLICY "Sistema pode atualizar certificados"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'certificados-regularidade');