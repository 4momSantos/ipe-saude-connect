-- Add new columns to editais table
ALTER TABLE public.editais
ADD COLUMN IF NOT EXISTS numero_edital TEXT,
ADD COLUMN IF NOT EXISTS objeto TEXT,
ADD COLUMN IF NOT EXISTS data_publicacao DATE,
ADD COLUMN IF NOT EXISTS data_licitacao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS local_portal TEXT,
ADD COLUMN IF NOT EXISTS prazo_validade_proposta INTEGER, -- dias
ADD COLUMN IF NOT EXISTS criterio_julgamento TEXT,
ADD COLUMN IF NOT EXISTS garantia_execucao DECIMAL(5,2), -- percentual
ADD COLUMN IF NOT EXISTS fonte_recursos TEXT,
ADD COLUMN IF NOT EXISTS participacao_permitida JSONB, -- {pj, consorcio, me_epp}
ADD COLUMN IF NOT EXISTS regras_me_epp TEXT,
ADD COLUMN IF NOT EXISTS documentos_habilitacao JSONB,
ADD COLUMN IF NOT EXISTS anexos JSONB, -- URLs dos anexos
ADD COLUMN IF NOT EXISTS historico_alteracoes JSONB DEFAULT '[]'::jsonb;

-- Create storage bucket for edital attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'edital-anexos',
  'edital-anexos',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for edital-anexos bucket
CREATE POLICY "Gestores e admins podem fazer upload de anexos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'edital-anexos' AND
  (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Gestores e admins podem atualizar anexos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'edital-anexos' AND
  (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Gestores e admins podem deletar anexos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'edital-anexos' AND
  (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Autenticados podem ver anexos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'edital-anexos');