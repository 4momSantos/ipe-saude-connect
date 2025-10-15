-- ============================================
-- FASE 4: CONFIGURAR STORAGE BUCKET
-- ============================================

-- 1. Criar bucket certificados-regularidade (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados-regularidade', 'certificados-regularidade', false)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS Policies para Storage

-- Policy: Credenciados podem ler seus próprios certificados
CREATE POLICY "Credenciados podem ler seus certificados"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificados-regularidade'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE ie.candidato_id = auth.uid()
  )
);

-- Policy: Gestores e admins podem ler todos
CREATE POLICY "Gestores podem ler todos certificados"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'certificados-regularidade'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'gestor'::app_role)
  )
);

-- Policy: Service role pode inserir (via Edge Functions)
CREATE POLICY "Service pode inserir certificados"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'certificados-regularidade'
);
