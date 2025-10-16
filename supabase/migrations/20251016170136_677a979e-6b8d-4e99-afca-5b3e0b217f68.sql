-- Criar tabela de lembretes de avaliação
CREATE TABLE IF NOT EXISTS public.lembretes_avaliacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  gestor_id UUID NOT NULL,
  periodo_referencia DATE NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida', 'ignorada')),
  data_lembrete DATE NOT NULL,
  notificado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lembretes_credenciado ON public.lembretes_avaliacao(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_gestor ON public.lembretes_avaliacao(gestor_id);
CREATE INDEX IF NOT EXISTS idx_lembretes_status ON public.lembretes_avaliacao(status);

-- RLS para lembretes
ALTER TABLE public.lembretes_avaliacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver seus lembretes"
ON public.lembretes_avaliacao FOR SELECT
USING (
  gestor_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Sistema pode criar lembretes"
ON public.lembretes_avaliacao FOR INSERT
WITH CHECK (true);

CREATE POLICY "Gestores podem atualizar seus lembretes"
ON public.lembretes_avaliacao FOR UPDATE
USING (gestor_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Função para calcular estatísticas híbridas
CREATE OR REPLACE FUNCTION public.calcular_estatisticas_hibridas(p_credenciado_id UUID)
RETURNS TABLE (
  nota_media_publica NUMERIC,
  total_avaliacoes_publicas BIGINT,
  nota_media_interna NUMERIC,
  total_avaliacoes_internas BIGINT,
  performance_score NUMERIC,
  criterios_destaque JSONB,
  pontos_fortes TEXT[],
  pontos_fracos TEXT[],
  badges TEXT[]
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nota_publica NUMERIC;
  v_count_publica BIGINT;
  v_nota_interna NUMERIC;
  v_count_interna BIGINT;
BEGIN
  -- Calcular dados públicos
  SELECT 
    COALESCE(AVG(ap.nota_estrelas), 0),
    COUNT(ap.id)
  INTO v_nota_publica, v_count_publica
  FROM avaliacoes_publicas ap
  WHERE ap.credenciado_id = p_credenciado_id
    AND ap.status = 'aprovada';
  
  -- Calcular dados internos
  SELECT 
    COALESCE(AVG(avp.pontuacao_geral), 0),
    COUNT(avp.id)
  INTO v_nota_interna, v_count_interna
  FROM avaliacoes_prestadores avp
  WHERE avp.credenciado_id = p_credenciado_id
    AND avp.status = 'finalizada';
  
  RETURN QUERY
  SELECT 
    v_nota_publica,
    v_count_publica,
    v_nota_interna,
    v_count_interna,
    -- Score híbrido (60% pública + 40% interna)
    CASE 
      WHEN v_count_publica > 0 AND v_count_interna > 0 THEN
        (v_nota_publica * 0.6) + (v_nota_interna * 0.4)
      WHEN v_count_publica > 0 THEN v_nota_publica
      WHEN v_count_interna > 0 THEN v_nota_interna
      ELSE 0
    END AS performance_score,
    -- Análise de critérios
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'nome', elem->>'nome',
          'media', AVG((elem->>'pontuacao')::NUMERIC)
        )
      )
      FROM avaliacoes_prestadores avp2,
      jsonb_array_elements(avp2.criterios) AS elem
      WHERE avp2.credenciado_id = p_credenciado_id
        AND avp2.status = 'finalizada'
      GROUP BY elem->>'nome'
    ) AS criterios_destaque,
    -- Pontos fortes
    ARRAY(
      SELECT DISTINCT pontos_positivos
      FROM avaliacoes_prestadores
      WHERE credenciado_id = p_credenciado_id
        AND pontos_positivos IS NOT NULL
        AND pontos_positivos != ''
      LIMIT 5
    ) AS pontos_fortes,
    -- Pontos fracos
    ARRAY(
      SELECT DISTINCT pontos_melhoria
      FROM avaliacoes_prestadores
      WHERE credenciado_id = p_credenciado_id
        AND pontos_melhoria IS NOT NULL
        AND pontos_melhoria != ''
      LIMIT 5
    ) AS pontos_fracos,
    -- Badges baseados em critérios híbridos
    ARRAY(
      SELECT badge FROM (
        SELECT 
          CASE 
            WHEN v_nota_publica >= 4.5 AND v_count_publica >= 10 THEN 'top_rated_publico'
            WHEN v_nota_interna >= 4.5 AND v_count_interna >= 3 THEN 'excelencia_interna'
            WHEN (v_nota_publica * 0.6 + v_nota_interna * 0.4) >= 4.7 THEN 'elite_performer'
          END AS badge
      ) sub
      WHERE badge IS NOT NULL
    ) AS badges;
END;
$$ LANGUAGE plpgsql;

-- Função para criar lembretes mensais
CREATE OR REPLACE FUNCTION public.criar_lembretes_avaliacao_mensal()
RETURNS void 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gestor_id UUID;
BEGIN
  -- Pegar primeiro gestor ativo
  SELECT user_id INTO v_gestor_id
  FROM user_roles
  WHERE role = 'gestor'::app_role
  LIMIT 1;
  
  IF v_gestor_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Criar lembretes para todos credenciados ativos
  INSERT INTO lembretes_avaliacao (credenciado_id, gestor_id, periodo_referencia, data_lembrete)
  SELECT 
    c.id,
    v_gestor_id,
    date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE,
    CURRENT_DATE + INTERVAL '5 days'
  FROM credenciados c
  WHERE c.status = 'Ativo'
    AND NOT EXISTS (
      SELECT 1 FROM avaliacoes_prestadores ap
      WHERE ap.credenciado_id = c.id
        AND ap.periodo_referencia >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE
        AND ap.status = 'finalizada'
    )
    AND NOT EXISTS (
      SELECT 1 FROM lembretes_avaliacao la
      WHERE la.credenciado_id = c.id
        AND la.periodo_referencia = date_trunc('month', CURRENT_DATE - INTERVAL '1 month')::DATE
    );
END;
$$ LANGUAGE plpgsql;