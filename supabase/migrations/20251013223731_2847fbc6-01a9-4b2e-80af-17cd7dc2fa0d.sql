-- Fase 5: Criar tabela de histórico de certificados
CREATE TABLE IF NOT EXISTS public.certificados_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificado_id UUID REFERENCES public.certificados(id) ON DELETE CASCADE,
  credenciado_id UUID REFERENCES public.credenciados(id) ON DELETE CASCADE,
  numero_certificado TEXT NOT NULL,
  documento_url TEXT,
  motivo TEXT NOT NULL, -- 'emissao_inicial', 'regeneracao', 'nova_copia', 'expiracao', etc.
  gerado_por UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_certificados_historico_certificado 
  ON public.certificados_historico(certificado_id);
CREATE INDEX IF NOT EXISTS idx_certificados_historico_credenciado 
  ON public.certificados_historico(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_certificados_historico_created 
  ON public.certificados_historico(created_at DESC);

-- RLS
ALTER TABLE public.certificados_historico ENABLE ROW LEVEL SECURITY;

-- Gestores podem ver todo histórico
CREATE POLICY "Gestores podem ver histórico de certificados"
  ON public.certificados_historico
  FOR SELECT
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Credenciados podem ver seu próprio histórico
CREATE POLICY "Credenciados podem ver seu histórico"
  ON public.certificados_historico
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.credenciados c
      JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
      WHERE c.id = certificados_historico.credenciado_id
        AND ie.candidato_id = auth.uid()
    )
  );

-- Sistema pode inserir no histórico
CREATE POLICY "Sistema pode inserir histórico"
  ON public.certificados_historico
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.certificados_historico IS 'Histórico de todas as versões/regenerações de certificados emitidos';