-- Criar bucket para imagens de contratos se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'contract-images'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('contract-images', 'contract-images', true);
  END IF;
END $$;

-- Política para permitir uploads autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can upload contract images'
  ) THEN
    CREATE POLICY "Authenticated users can upload contract images"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'contract-images');
  END IF;
END $$;

-- Política para visualização pública
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Public can view contract images'
  ) THEN
    CREATE POLICY "Public can view contract images"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'contract-images');
  END IF;
END $$;

-- Política para atualização por usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can update contract images'
  ) THEN
    CREATE POLICY "Authenticated users can update contract images"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'contract-images');
  END IF;
END $$;

-- Política para deleção por usuários autenticados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can delete contract images'
  ) THEN
    CREATE POLICY "Authenticated users can delete contract images"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'contract-images');
  END IF;
END $$;