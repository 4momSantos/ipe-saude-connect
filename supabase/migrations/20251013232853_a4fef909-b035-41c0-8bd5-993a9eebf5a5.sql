-- Criar bucket para imagens de contratos
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-images', 'contract-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: Gestores podem fazer upload de imagens
CREATE POLICY "Gestores podem fazer upload de imagens de contratos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contract-images' AND
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('gestor', 'admin')
  ))
);

-- RLS: Todos podem ver as imagens
CREATE POLICY "Todos podem ver imagens de contratos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contract-images');

-- RLS: Gestores podem atualizar imagens
CREATE POLICY "Gestores podem atualizar imagens de contratos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contract-images' AND
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('gestor', 'admin')
  ))
);

-- RLS: Gestores podem deletar imagens
CREATE POLICY "Gestores podem deletar imagens de contratos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'contract-images' AND
  (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('gestor', 'admin')
  ))
);