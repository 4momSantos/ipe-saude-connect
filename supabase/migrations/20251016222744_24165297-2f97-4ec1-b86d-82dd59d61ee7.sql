-- ============================================
-- CORREÇÃO: Bucket Público + Política RLS + URLs
-- ============================================

-- 1. Tornar bucket 'contratos' PÚBLICO
UPDATE storage.buckets 
SET public = true 
WHERE id = 'contratos';

-- 2. Recriar política RLS corrigida para downloads
DROP POLICY IF EXISTS "Usuários podem baixar seus contratos" ON storage.objects;

CREATE POLICY "Usuários podem baixar seus contratos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contratos' AND
  (
    -- Gestores/analistas veem todos os contratos
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND role IN ('gestor', 'admin', 'analista')
    )
    OR
    -- Candidatos veem contratos onde inscricao_id está no path
    EXISTS (
      SELECT 1 
      FROM public.contratos c
      JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
      WHERE name LIKE '%' || c.inscricao_id::text || '%'
        AND ie.candidato_id = auth.uid()
    )
  )
);

-- 3. Atualizar URLs dos contratos existentes para usar /public/
UPDATE public.contratos
SET documento_url = REPLACE(documento_url, '/object/contratos/', '/object/public/contratos/')
WHERE documento_url IS NOT NULL
  AND documento_url LIKE '%/object/contratos/%'
  AND documento_url NOT LIKE '%/object/public/contratos/%';