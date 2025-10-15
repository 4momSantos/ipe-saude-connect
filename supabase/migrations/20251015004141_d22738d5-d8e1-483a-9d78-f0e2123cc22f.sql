-- ========================================
-- BUCKET DE STORAGE PARA ANEXOS DE MENSAGENS
-- ========================================

-- Criar bucket para anexos (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workflow-anexos',
  'workflow-anexos',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies para o bucket
CREATE POLICY "Usuários autenticados podem fazer upload de anexos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workflow-anexos'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Usuários podem ver anexos de mensagens visíveis"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'workflow-anexos'
  AND (
    -- Arquivo próprio
    owner = auth.uid()
    OR
    -- Arquivo de mensagem visível
    EXISTS (
      SELECT 1 
      FROM anexos_mensagens am
      JOIN workflow_messages wm ON wm.id = am.mensagem_id
      WHERE am.storage_path LIKE '%' || storage.objects.name || '%'
      AND (
        wm.sender_id = auth.uid()
        OR 'todos' = ANY(wm.visivel_para)
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          WHERE ur.user_id = auth.uid()
          AND ur.role::text = ANY(wm.visivel_para)
        )
      )
    )
  )
);

CREATE POLICY "Usuários podem deletar seus próprios anexos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'workflow-anexos'
  AND owner = auth.uid()
);