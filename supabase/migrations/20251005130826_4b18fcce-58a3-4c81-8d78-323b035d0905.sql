-- Criar bucket para arquivos temporários de OCR
INSERT INTO storage.buckets (id, name, public)
VALUES ('ocr-temp-files', 'ocr-temp-files', true);

-- Política: qualquer usuário autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload OCR files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ocr-temp-files');

-- Política: qualquer usuário autenticado pode ler arquivos OCR
CREATE POLICY "Authenticated users can read OCR files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'ocr-temp-files');

-- Política: qualquer usuário autenticado pode deletar seus arquivos
CREATE POLICY "Authenticated users can delete their OCR files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'ocr-temp-files');