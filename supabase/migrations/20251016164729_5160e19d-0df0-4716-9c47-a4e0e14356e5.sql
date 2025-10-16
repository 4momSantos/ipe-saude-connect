-- Tabela de avaliações públicas
CREATE TABLE IF NOT EXISTS public.avaliacoes_publicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  
  -- Dados do avaliador
  avaliador_nome TEXT,
  avaliador_email TEXT,
  avaliador_anonimo BOOLEAN DEFAULT false,
  avaliador_verificado BOOLEAN DEFAULT false,
  
  -- Avaliação
  nota_estrelas INTEGER NOT NULL CHECK (nota_estrelas >= 1 AND nota_estrelas <= 5),
  comentario TEXT NOT NULL,
  data_atendimento DATE,
  tipo_servico TEXT,
  comprovante_url TEXT,
  
  -- Moderação
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'reportada')),
  moderacao_ia_score NUMERIC,
  moderacao_ia_motivo TEXT,
  moderador_id UUID REFERENCES auth.users(id),
  moderado_em TIMESTAMPTZ,
  
  -- Resposta do profissional
  resposta_profissional TEXT,
  respondido_em TIMESTAMPTZ,
  respondido_por UUID REFERENCES auth.users(id),
  
  -- Denúncias
  denunciada BOOLEAN DEFAULT false,
  motivo_denuncia TEXT,
  denunciada_em TIMESTAMPTZ,
  denunciada_por UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_avaliacoes_publicas_credenciado ON public.avaliacoes_publicas(credenciado_id);
CREATE INDEX idx_avaliacoes_publicas_status ON public.avaliacoes_publicas(status);
CREATE INDEX idx_avaliacoes_publicas_nota ON public.avaliacoes_publicas(nota_estrelas);
CREATE INDEX idx_avaliacoes_publicas_created ON public.avaliacoes_publicas(created_at DESC);

-- Tabela de estatísticas
CREATE TABLE IF NOT EXISTS public.estatisticas_credenciado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID UNIQUE NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  
  nota_media_publica NUMERIC,
  total_avaliacoes_publicas INTEGER NOT NULL DEFAULT 0,
  distribuicao_notas JSONB NOT NULL DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
  
  nota_media_interna NUMERIC,
  total_avaliacoes_internas INTEGER NOT NULL DEFAULT 0,
  
  performance_score NUMERIC NOT NULL DEFAULT 0,
  taxa_satisfacao NUMERIC,
  tempo_medio_atendimento INTEGER,
  indice_resolucao NUMERIC,
  
  ranking_especialidade INTEGER,
  ranking_regiao INTEGER,
  
  badges TEXT[] NOT NULL DEFAULT '{}',
  
  atualizado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_estatisticas_credenciado ON public.estatisticas_credenciado(credenciado_id);
CREATE INDEX idx_estatisticas_nota_media ON public.estatisticas_credenciado(nota_media_publica DESC);

-- Função para recalcular estatísticas
CREATE OR REPLACE FUNCTION public.recalcular_estatisticas_credenciado()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credenciado_id UUID;
  v_nota_media NUMERIC;
  v_total INTEGER;
  v_dist JSONB;
  v_badges TEXT[] := '{}';
BEGIN
  -- Pegar ID do credenciado (INSERT/UPDATE usa NEW, DELETE usa OLD)
  v_credenciado_id := COALESCE(NEW.credenciado_id, OLD.credenciado_id);
  
  -- Calcular estatísticas
  SELECT 
    ROUND(AVG(nota_estrelas)::numeric, 1),
    COUNT(*),
    jsonb_build_object(
      '1', COUNT(*) FILTER (WHERE nota_estrelas = 1),
      '2', COUNT(*) FILTER (WHERE nota_estrelas = 2),
      '3', COUNT(*) FILTER (WHERE nota_estrelas = 3),
      '4', COUNT(*) FILTER (WHERE nota_estrelas = 4),
      '5', COUNT(*) FILTER (WHERE nota_estrelas = 5)
    )
  INTO v_nota_media, v_total, v_dist
  FROM public.avaliacoes_publicas
  WHERE credenciado_id = v_credenciado_id 
    AND status = 'aprovada';
  
  -- Determinar badges
  IF v_nota_media >= 4.5 AND v_total >= 10 THEN
    v_badges := array_append(v_badges, 'Top Rated');
  END IF;
  
  IF v_total >= 50 THEN
    v_badges := array_append(v_badges, 'Popular');
  END IF;
  
  IF v_total >= 5 THEN
    v_badges := array_append(v_badges, 'Verificado');
  END IF;
  
  -- Upsert nas estatísticas
  INSERT INTO public.estatisticas_credenciado (
    credenciado_id,
    nota_media_publica,
    total_avaliacoes_publicas,
    distribuicao_notas,
    badges,
    atualizado_em
  )
  VALUES (
    v_credenciado_id,
    v_nota_media,
    COALESCE(v_total, 0),
    v_dist,
    v_badges,
    now()
  )
  ON CONFLICT (credenciado_id) DO UPDATE SET
    nota_media_publica = EXCLUDED.nota_media_publica,
    total_avaliacoes_publicas = EXCLUDED.total_avaliacoes_publicas,
    distribuicao_notas = EXCLUDED.distribuicao_notas,
    badges = EXCLUDED.badges,
    atualizado_em = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualização automática
DROP TRIGGER IF EXISTS trigger_atualizar_estatisticas_avaliacao ON public.avaliacoes_publicas;
CREATE TRIGGER trigger_atualizar_estatisticas_avaliacao
AFTER INSERT OR UPDATE OR DELETE ON public.avaliacoes_publicas
FOR EACH ROW EXECUTE FUNCTION public.recalcular_estatisticas_credenciado();

-- RLS Policies
ALTER TABLE public.avaliacoes_publicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estatisticas_credenciado ENABLE ROW LEVEL SECURITY;

-- Leitura pública de avaliações aprovadas
CREATE POLICY "Leitura pública de avaliações aprovadas"
ON public.avaliacoes_publicas FOR SELECT
USING (status = 'aprovada');

-- Qualquer um pode criar avaliação (será moderada)
CREATE POLICY "Qualquer um pode criar avaliação pública"
ON public.avaliacoes_publicas FOR INSERT
WITH CHECK (true);

-- Gestores podem moderar
CREATE POLICY "Gestores podem moderar avaliações"
ON public.avaliacoes_publicas FOR UPDATE
USING (
  has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin')
);

-- Credenciado pode responder sua avaliação
CREATE POLICY "Credenciado pode responder avaliação"
ON public.avaliacoes_publicas FOR UPDATE
USING (
  credenciado_id IN (
    SELECT c.id FROM public.credenciados c
    JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE ie.candidato_id = auth.uid()
  )
);

-- Leitura pública de estatísticas
CREATE POLICY "Leitura pública de estatísticas"
ON public.estatisticas_credenciado FOR SELECT
USING (true);

-- Sistema pode atualizar estatísticas
CREATE POLICY "Sistema pode atualizar estatísticas"
ON public.estatisticas_credenciado FOR ALL
USING (true);