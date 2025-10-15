-- Criar tabela para histórico de documentos emitidos
CREATE TABLE IF NOT EXISTS public.documentos_emitidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  numero_documento TEXT,
  url_documento TEXT NOT NULL,
  emitido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  emitido_por UUID REFERENCES auth.users(id),
  validade_ate TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_docs_emitidos_credenciado ON public.documentos_emitidos(credenciado_id);
CREATE INDEX idx_docs_emitidos_tipo ON public.documentos_emitidos(tipo_documento);

-- RLS
ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Credenciados veem seus documentos"
ON public.documentos_emitidos FOR SELECT
USING (
  credenciado_id IN (
    SELECT c.id FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE ie.candidato_id = auth.uid()
  )
);

CREATE POLICY "Gestores veem todos documentos"
ON public.documentos_emitidos FOR SELECT
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Sistema pode inserir documentos"
ON public.documentos_emitidos FOR INSERT
WITH CHECK (true);