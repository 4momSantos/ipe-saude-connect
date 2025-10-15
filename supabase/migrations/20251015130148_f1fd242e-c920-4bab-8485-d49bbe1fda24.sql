-- FASE 3: Tabela de Histórico de Ações em Prazos
CREATE TABLE IF NOT EXISTS public.acoes_prazos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prazo_id UUID NOT NULL REFERENCES public.prazos_credenciamento(id) ON DELETE CASCADE,
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  tipo_acao TEXT NOT NULL CHECK (tipo_acao IN ('prorrogado', 'notificado', 'renovado', 'vencido_notificado')),
  data_anterior DATE,
  data_nova DATE,
  justificativa TEXT,
  executado_por UUID REFERENCES auth.users(id),
  executado_por_nome TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_acoes_prazos_prazo ON public.acoes_prazos(prazo_id);
CREATE INDEX idx_acoes_prazos_credenciado ON public.acoes_prazos(credenciado_id);
CREATE INDEX idx_acoes_prazos_tipo ON public.acoes_prazos(tipo_acao);
CREATE INDEX idx_acoes_prazos_data ON public.acoes_prazos(created_at DESC);

-- RLS Policies
ALTER TABLE public.acoes_prazos ENABLE ROW LEVEL SECURITY;

-- Gestores podem ver todo histórico
CREATE POLICY "Gestores podem ver histórico de ações"
ON public.acoes_prazos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Sistema pode inserir ações
CREATE POLICY "Sistema pode inserir ações"
ON public.acoes_prazos
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Comentários
COMMENT ON TABLE public.acoes_prazos IS 'Histórico de ações manuais realizadas em prazos de credenciamento';
COMMENT ON COLUMN public.acoes_prazos.tipo_acao IS 'Tipo de ação: prorrogado, notificado, renovado, vencido_notificado';
COMMENT ON COLUMN public.acoes_prazos.justificativa IS 'Justificativa obrigatória para prorrogações';