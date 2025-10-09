-- FASE 2: Versionamento de Documentos
ALTER TABLE public.inscricao_documentos 
ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES public.inscricao_documentos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS replaced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS replaced_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_inscricao_documentos_parent ON public.inscricao_documentos(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_inscricao_documentos_current ON public.inscricao_documentos(is_current);