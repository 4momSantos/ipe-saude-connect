-- FASE 4: Ocorrências e Sanções
CREATE TABLE IF NOT EXISTS public.ocorrencias_prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('reclamacao', 'advertencia', 'elogio', 'observacao')),
  gravidade TEXT NOT NULL DEFAULT 'baixa' CHECK (gravidade IN ('baixa', 'media', 'alta', 'critica')),
  descricao TEXT NOT NULL,
  data_ocorrencia DATE NOT NULL,
  relator_id UUID REFERENCES auth.users(id),
  protocolo TEXT UNIQUE,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_analise', 'resolvida', 'arquivada')),
  providencias TEXT,
  anexos JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sancoes_prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  ocorrencia_id UUID REFERENCES public.ocorrencias_prestadores(id),
  tipo_sancao TEXT NOT NULL CHECK (tipo_sancao IN ('advertencia', 'suspensao', 'multa', 'descredenciamento')),
  motivo TEXT NOT NULL,
  valor_multa NUMERIC(10,2),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  duracao_dias INTEGER,
  aplicada_por UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'ativa' CHECK (status IN ('ativa', 'cumprida', 'cancelada', 'suspensa')),
  observacoes TEXT,
  processo_administrativo TEXT,
  recurso_apresentado BOOLEAN DEFAULT false,
  recurso_deferido BOOLEAN,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ocorrencias_credenciado ON public.ocorrencias_prestadores(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_tipo ON public.ocorrencias_prestadores(tipo);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_gravidade ON public.ocorrencias_prestadores(gravidade);
CREATE INDEX IF NOT EXISTS idx_sancoes_credenciado ON public.sancoes_prestadores(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_sancoes_tipo ON public.sancoes_prestadores(tipo_sancao);
CREATE INDEX IF NOT EXISTS idx_sancoes_status ON public.sancoes_prestadores(status);

ALTER TABLE public.ocorrencias_prestadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sancoes_prestadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar ocorrências"
ON public.ocorrencias_prestadores FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Credenciados podem ver suas ocorrências"
ON public.ocorrencias_prestadores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = ocorrencias_prestadores.credenciado_id
      AND ie.candidato_id = auth.uid()
  )
);

CREATE POLICY "Gestores podem gerenciar sanções"
ON public.sancoes_prestadores FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Credenciados podem ver suas sanções"
ON public.sancoes_prestadores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = sancoes_prestadores.credenciado_id
      AND ie.candidato_id = auth.uid()
  )
);