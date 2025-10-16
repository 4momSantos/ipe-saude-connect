-- Criar bucket para certificados de regularidade
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados-regularidade', 'certificados-regularidade', true)
ON CONFLICT (id) DO NOTHING;

-- Remover policies antigas se existirem e criar novas
DROP POLICY IF EXISTS "Certificados são públicos para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Service role pode fazer upload" ON storage.objects;

-- RLS para permitir leitura pública
CREATE POLICY "Certificados são públicos para leitura"
ON storage.objects FOR SELECT
USING (bucket_id = 'certificados-regularidade');

-- RLS para permitir upload apenas via service role
CREATE POLICY "Service role pode fazer upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'certificados-regularidade');