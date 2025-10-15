-- =====================================================
-- FASE 1: TABELAS DE PROFISSIONAIS E INDICADORES
-- =====================================================

-- Tabela de profissionais vinculados a credenciados
CREATE TABLE IF NOT EXISTS public.profissionais_credenciados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  
  -- Dados do profissional
  nome TEXT NOT NULL,
  cpf TEXT,
  crm TEXT NOT NULL,
  uf_crm TEXT NOT NULL,
  especialidade TEXT NOT NULL,
  especialidade_id UUID REFERENCES public.especialidades_medicas(id),
  
  -- Tipo de vínculo
  principal BOOLEAN DEFAULT true,
  data_vinculo DATE DEFAULT CURRENT_DATE,
  data_desvinculo DATE,
  
  -- Contato
  email TEXT,
  telefone TEXT,
  
  -- Status
  ativo BOOLEAN DEFAULT true,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(credenciado_id, crm, uf_crm)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prof_cred_credenciado ON public.profissionais_credenciados(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_prof_cred_ativo ON public.profissionais_credenciados(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_prof_cred_especialidade ON public.profissionais_credenciados(especialidade);

-- Tabela de indicadores de performance
CREATE TABLE IF NOT EXISTS public.indicadores_profissionais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profissional_id UUID NOT NULL REFERENCES public.profissionais_credenciados(id) ON DELETE CASCADE,
  
  -- Período
  mes_referencia DATE NOT NULL,
  
  -- Métricas de produtividade
  atendimentos INTEGER DEFAULT 0,
  atendimentos_meta INTEGER DEFAULT 100,
  procedimentos_realizados INTEGER DEFAULT 0,
  horas_trabalhadas NUMERIC(6,2) DEFAULT 0,
  
  -- Qualidade
  taxa_comparecimento NUMERIC(5,2),
  tempo_medio_atendimento NUMERIC(6,2),
  
  -- Avaliação
  avaliacao_media NUMERIC(3,2),
  total_avaliacoes INTEGER DEFAULT 0,
  
  -- Metadados
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(profissional_id, mes_referencia)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_ind_prof_profissional ON public.indicadores_profissionais(profissional_id);
CREATE INDEX IF NOT EXISTS idx_ind_prof_mes ON public.indicadores_profissionais(mes_referencia);

-- =====================================================
-- FASE 2: MIGRAÇÃO DE DADOS EXISTENTES
-- =====================================================

-- Migrar de credenciado_crms para profissionais_credenciados
INSERT INTO public.profissionais_credenciados (
  credenciado_id,
  nome,
  crm,
  uf_crm,
  especialidade,
  especialidade_id,
  principal
)
SELECT DISTINCT
  cc.credenciado_id,
  c.nome,
  cc.crm,
  cc.uf_crm,
  cc.especialidade,
  cc.especialidade_id,
  true
FROM public.credenciado_crms cc
JOIN public.credenciados c ON c.id = cc.credenciado_id
WHERE c.cpf IS NOT NULL
ON CONFLICT (credenciado_id, crm, uf_crm) DO NOTHING;

-- =====================================================
-- FASE 3: FUNÇÕES SQL DE RELATÓRIO
-- =====================================================

-- Função: Relatório por Profissionais
CREATE OR REPLACE FUNCTION public.relatorio_media_mediana_profissionais(
  p_mes_referencia DATE DEFAULT NULL,
  p_especialidade TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_credenciado_id UUID DEFAULT NULL
)
RETURNS TABLE (
  profissional_id UUID,
  nome_profissional TEXT,
  crm TEXT,
  uf_crm TEXT,
  especialidade TEXT,
  credenciado_id UUID,
  nome_credenciado TEXT,
  cidade TEXT,
  estado TEXT,
  tipo_vinculo TEXT,
  media_avaliacao NUMERIC(4,2),
  mediana_avaliacao NUMERIC(4,2),
  total_avaliacoes INTEGER,
  media_produtividade NUMERIC(6,2),
  mediana_produtividade NUMERIC(6,2),
  media_horas NUMERIC(6,2),
  score_composto NUMERIC(5,2)
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH avaliacoes_agregadas AS (
    SELECT 
      ap.credenciado_id,
      ROUND(AVG(ap.pontuacao_geral), 2) AS media_aval,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ap.pontuacao_geral) AS mediana_aval,
      COUNT(*) AS total_aval
    FROM public.avaliacoes_prestadores ap
    WHERE ap.status = 'finalizada'
      AND (p_mes_referencia IS NULL OR ap.periodo_referencia = p_mes_referencia)
    GROUP BY ap.credenciado_id
  ),
  indicadores_agregados AS (
    SELECT 
      ip.profissional_id,
      ROUND(AVG(ip.atendimentos)::NUMERIC, 2) AS media_prod,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ip.atendimentos) AS mediana_prod,
      ROUND(AVG(ip.horas_trabalhadas)::NUMERIC, 2) AS media_hrs
    FROM public.indicadores_profissionais ip
    WHERE (p_mes_referencia IS NULL OR ip.mes_referencia = p_mes_referencia)
    GROUP BY ip.profissional_id
  )
  SELECT 
    p.id AS profissional_id,
    p.nome AS nome_profissional,
    p.crm,
    p.uf_crm,
    p.especialidade,
    c.id AS credenciado_id,
    c.nome AS nome_credenciado,
    c.cidade,
    c.estado,
    CASE WHEN p.principal THEN 'Principal' ELSE 'Secundário' END AS tipo_vinculo,
    COALESCE(aa.media_aval, 0) AS media_avaliacao,
    COALESCE(aa.mediana_aval, 0) AS mediana_avaliacao,
    COALESCE(aa.total_aval, 0)::INTEGER AS total_avaliacoes,
    COALESCE(ia.media_prod, 0) AS media_produtividade,
    COALESCE(ia.mediana_prod, 0) AS mediana_produtividade,
    COALESCE(ia.media_hrs, 0) AS media_horas,
    ROUND(
      (COALESCE(aa.media_aval, 0) / 5.0 * 100 * 0.6) +
      (
        CASE 
          WHEN MAX(ia.media_prod) OVER () > 0 
          THEN (COALESCE(ia.media_prod, 0) / MAX(ia.media_prod) OVER () * 100 * 0.4)
          ELSE 0
        END
      ),
      2
    ) AS score_composto
  FROM public.profissionais_credenciados p
  JOIN public.credenciados c ON c.id = p.credenciado_id
  LEFT JOIN avaliacoes_agregadas aa ON aa.credenciado_id = c.id
  LEFT JOIN indicadores_agregados ia ON ia.profissional_id = p.id
  WHERE p.ativo = true
    AND (p_especialidade IS NULL OR p.especialidade ILIKE '%' || p_especialidade || '%')
    AND (p_estado IS NULL OR c.estado = p_estado)
    AND (p_credenciado_id IS NULL OR c.id = p_credenciado_id)
  ORDER BY score_composto DESC;
END;
$$;

-- Função: Relatório por Rede Credenciada
CREATE OR REPLACE FUNCTION public.relatorio_media_mediana_credenciados(
  p_mes_referencia DATE DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL
)
RETURNS TABLE (
  credenciado_id UUID,
  nome_credenciado TEXT,
  cnpj TEXT,
  cidade TEXT,
  estado TEXT,
  total_profissionais INTEGER,
  media_avaliacao_rede NUMERIC(4,2),
  mediana_avaliacao_rede NUMERIC(4,2),
  media_produtividade_rede NUMERIC(6,2),
  mediana_produtividade_rede NUMERIC(6,2),
  score_rede NUMERIC(5,2)
)
LANGUAGE sql
STABLE
AS $$
  WITH profissionais_sumarizados AS (
    SELECT * FROM public.relatorio_media_mediana_profissionais(p_mes_referencia, NULL, p_estado, NULL)
  )
  SELECT 
    c.id AS credenciado_id,
    c.nome AS nome_credenciado,
    c.cnpj,
    c.cidade,
    c.estado,
    COUNT(DISTINCT ps.profissional_id)::INTEGER AS total_profissionais,
    ROUND(AVG(ps.media_avaliacao), 2) AS media_avaliacao_rede,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ps.media_avaliacao) AS mediana_avaliacao_rede,
    ROUND(AVG(ps.media_produtividade), 2) AS media_produtividade_rede,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ps.media_produtividade) AS mediana_produtividade_rede,
    ROUND(AVG(ps.score_composto), 2) AS score_rede
  FROM public.credenciados c
  JOIN profissionais_sumarizados ps ON ps.credenciado_id = c.id
  WHERE c.status = 'Ativo'
    AND c.cnpj IS NOT NULL
    AND (p_cidade IS NULL OR c.cidade = p_cidade)
  GROUP BY c.id, c.nome, c.cnpj, c.cidade, c.estado
  ORDER BY score_rede DESC;
$$;

-- =====================================================
-- FASE 4: RLS POLICIES
-- =====================================================

ALTER TABLE public.profissionais_credenciados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_profissionais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver profissionais"
  ON public.profissionais_credenciados FOR SELECT
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'analista'::app_role)
  );

CREATE POLICY "Gestores podem gerenciar profissionais"
  ON public.profissionais_credenciados FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gestores podem ver indicadores"
  ON public.indicadores_profissionais FOR SELECT
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'analista'::app_role)
  );

CREATE POLICY "Gestores podem gerenciar indicadores"
  ON public.indicadores_profissionais FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));