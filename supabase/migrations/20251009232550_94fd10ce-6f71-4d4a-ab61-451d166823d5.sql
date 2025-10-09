-- FASE 4: Avaliações de Desempenho
CREATE TABLE IF NOT EXISTS public.criterios_avaliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  peso NUMERIC(3,2) DEFAULT 1.0 CHECK (peso >= 0 AND peso <= 5),
  tipo_pontuacao TEXT DEFAULT 'estrelas' CHECK (tipo_pontuacao IN ('estrelas', 'nota', 'binario')),
  categoria TEXT CHECK (categoria IN ('atendimento', 'tecnica', 'pontualidade', 'infraestrutura')),
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.avaliacoes_prestadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  avaliador_id UUID REFERENCES auth.users(id),
  periodo_referencia DATE NOT NULL,
  pontuacao_geral NUMERIC(3,2) CHECK (pontuacao_geral >= 0 AND pontuacao_geral <= 5),
  criterios JSONB NOT NULL DEFAULT '[]'::jsonb,
  pontos_positivos TEXT,
  pontos_melhoria TEXT,
  recomendacoes TEXT,
  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'finalizada', 'revisao')),
  finalizada_em TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(credenciado_id, periodo_referencia)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_credenciado ON public.avaliacoes_prestadores(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_periodo ON public.avaliacoes_prestadores(periodo_referencia);

-- Inserir critérios padrão
INSERT INTO public.criterios_avaliacao (nome, descricao, categoria, ordem) VALUES
('Qualidade do Atendimento', 'Cordialidade e atenção ao paciente', 'atendimento', 1),
('Pontualidade', 'Cumprimento de horários agendados', 'pontualidade', 2),
('Conhecimento Técnico', 'Domínio da especialidade', 'tecnica', 3),
('Infraestrutura', 'Qualidade das instalações e equipamentos', 'infraestrutura', 4),
('Comunicação', 'Clareza nas orientações e comunicação com equipe', 'atendimento', 5)
ON CONFLICT DO NOTHING;

ALTER TABLE public.criterios_avaliacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes_prestadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver critérios ativos"
ON public.criterios_avaliacao FOR SELECT TO authenticated
USING (ativo = true);

CREATE POLICY "Gestores podem gerenciar critérios"
ON public.criterios_avaliacao FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem gerenciar avaliações"
ON public.avaliacoes_prestadores FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Credenciados podem ver suas avaliações"
ON public.avaliacoes_prestadores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = avaliacoes_prestadores.credenciado_id
      AND ie.candidato_id = auth.uid()
  )
);

-- Função para estatísticas
CREATE OR REPLACE FUNCTION public.calcular_estatisticas_avaliacoes(p_periodo_inicio DATE DEFAULT NULL, p_periodo_fim DATE DEFAULT NULL)
RETURNS TABLE (
  media_geral NUMERIC,
  total_avaliacoes BIGINT,
  credenciados_avaliados BIGINT,
  melhor_nota NUMERIC,
  pior_nota NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodo_inicio DATE := COALESCE(p_periodo_inicio, CURRENT_DATE - INTERVAL '30 days');
  v_periodo_fim DATE := COALESCE(p_periodo_fim, CURRENT_DATE);
BEGIN
  RETURN QUERY
  SELECT
    AVG(pontuacao_geral)::NUMERIC(3,2),
    COUNT(*)::BIGINT,
    COUNT(DISTINCT credenciado_id)::BIGINT,
    MAX(pontuacao_geral)::NUMERIC(3,2),
    MIN(pontuacao_geral)::NUMERIC(3,2)
  FROM public.avaliacoes_prestadores
  WHERE status = 'finalizada'
    AND periodo_referencia BETWEEN v_periodo_inicio AND v_periodo_fim;
END;
$$;