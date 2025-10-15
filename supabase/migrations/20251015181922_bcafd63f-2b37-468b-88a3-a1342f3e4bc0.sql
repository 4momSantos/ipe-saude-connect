-- =====================================================
-- MIGRATION: Catálogo de Serviços e Procedimentos
-- =====================================================

-- 1. CRIAR TABELA DE PROCEDIMENTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.procedimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo_tuss TEXT UNIQUE,
  descricao TEXT,
  especialidade_id UUID REFERENCES public.especialidades_medicas(id) ON DELETE SET NULL,
  categoria TEXT CHECK (categoria IN ('consulta', 'exame', 'cirurgia', 'procedimento', 'terapia')),
  tipo TEXT CHECK (tipo IN ('ambulatorial', 'hospitalar', 'emergencia', 'domiciliar')),
  duracao_media INTEGER,
  complexidade TEXT CHECK (complexidade IN ('baixa', 'media', 'alta')),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.procedimentos IS 'Catálogo de procedimentos médicos vinculados a especialidades (TUSS)';
COMMENT ON COLUMN public.procedimentos.codigo_tuss IS 'Código TUSS - Terminologia Unificada da Saúde Suplementar';
COMMENT ON COLUMN public.procedimentos.categoria IS 'Tipo do procedimento: consulta, exame, cirurgia, procedimento, terapia';
COMMENT ON COLUMN public.procedimentos.duracao_media IS 'Duração média do procedimento em minutos';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_procedimentos_especialidade ON public.procedimentos(especialidade_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_procedimentos_categoria ON public.procedimentos(categoria) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_procedimentos_codigo_tuss ON public.procedimentos(codigo_tuss) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_procedimentos_nome_busca ON public.procedimentos USING gin(to_tsvector('portuguese', nome));

-- 2. CRIAR TABELA DE SERVIÇOS DO CREDENCIADO
-- =====================================================

CREATE TABLE IF NOT EXISTS public.credenciado_servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  procedimento_id UUID NOT NULL REFERENCES public.procedimentos(id) ON DELETE CASCADE,
  profissional_id UUID REFERENCES public.profissionais_credenciados(id) ON DELETE SET NULL,
  
  -- Precificação
  preco_base NUMERIC(10,2),
  preco_particular NUMERIC(10,2),
  preco_convenio NUMERIC(10,2),
  aceita_sus BOOLEAN DEFAULT false,
  
  -- Disponibilidade
  disponivel BOOLEAN DEFAULT true,
  disponivel_online BOOLEAN DEFAULT false,
  local_atendimento TEXT,
  dias_atendimento TEXT[],
  horario_inicio TIME,
  horario_fim TIME,
  
  -- Metadados
  observacoes TEXT,
  requisitos TEXT,
  tempo_espera_medio INTEGER,
  prioridade INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT chk_preco_base_positivo CHECK (preco_base IS NULL OR preco_base >= 0),
  CONSTRAINT chk_horario_valido CHECK (horario_inicio IS NULL OR horario_fim IS NULL OR horario_fim > horario_inicio)
);

COMMENT ON TABLE public.credenciado_servicos IS 'Catálogo de serviços/procedimentos ofertados pelos credenciados';
COMMENT ON COLUMN public.credenciado_servicos.preco_base IS 'Preço base do procedimento (pode variar por convênio)';
COMMENT ON COLUMN public.credenciado_servicos.disponivel_online IS 'Se o procedimento pode ser realizado via telemedicina';
COMMENT ON COLUMN public.credenciado_servicos.tempo_espera_medio IS 'Tempo médio de espera para agendamento em dias';

-- Índices para performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_unq_credenciado_procedimento_profissional 
  ON public.credenciado_servicos(credenciado_id, procedimento_id, COALESCE(profissional_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_credenciado_servicos_credenciado ON public.credenciado_servicos(credenciado_id) WHERE disponivel = true;
CREATE INDEX IF NOT EXISTS idx_credenciado_servicos_procedimento ON public.credenciado_servicos(procedimento_id) WHERE disponivel = true;
CREATE INDEX IF NOT EXISTS idx_credenciado_servicos_profissional ON public.credenciado_servicos(profissional_id) WHERE disponivel = true;
CREATE INDEX IF NOT EXISTS idx_credenciado_servicos_disponivel ON public.credenciado_servicos(disponivel, disponivel_online);

-- 3. INSERIR PROCEDIMENTOS SEED
-- =====================================================

-- Inserir procedimentos de Cardiologia
INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Consulta Cardiológica', '10101012', id, 'consulta', 'ambulatorial', 30, 'media', true
FROM especialidades_medicas WHERE nome = 'Cardiologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Eletrocardiograma (ECG)', '21030014', id, 'exame', 'ambulatorial', 15, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Cardiologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Ecocardiograma', '21040019', id, 'exame', 'ambulatorial', 30, 'media', true
FROM especialidades_medicas WHERE nome = 'Cardiologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Holter 24h', '21050013', id, 'exame', 'ambulatorial', 20, 'media', true
FROM especialidades_medicas WHERE nome = 'Cardiologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'MAPA (Monitorização Ambulatorial da Pressão Arterial)', '21060018', id, 'exame', 'ambulatorial', 20, 'media', true
FROM especialidades_medicas WHERE nome = 'Cardiologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

-- Inserir procedimentos de Pediatria
INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Consulta Pediátrica', '10101039', id, 'consulta', 'ambulatorial', 30, 'media', true
FROM especialidades_medicas WHERE nome = 'Pediatria'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Puericultura', '10101047', id, 'consulta', 'ambulatorial', 30, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Pediatria'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Vacinação Infantil', '30101019', id, 'procedimento', 'ambulatorial', 10, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Pediatria'
ON CONFLICT (codigo_tuss) DO NOTHING;

-- Inserir procedimentos de Ortopedia
INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Consulta Ortopédica', '10101055', id, 'consulta', 'ambulatorial', 30, 'media', true
FROM especialidades_medicas WHERE nome = 'Ortopedia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Raio-X de Membros', '40301141', id, 'exame', 'ambulatorial', 15, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Ortopedia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Infiltração Articular', '31201016', id, 'procedimento', 'ambulatorial', 20, 'media', true
FROM especialidades_medicas WHERE nome = 'Ortopedia'
ON CONFLICT (codigo_tuss) DO NOTHING;

-- Inserir procedimentos de Ginecologia
INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Consulta Ginecológica', '10101063', id, 'consulta', 'ambulatorial', 30, 'media', true
FROM especialidades_medicas WHERE nome = 'Ginecologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Papanicolau', '31201032', id, 'exame', 'ambulatorial', 15, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Ginecologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Ultrassonografia Transvaginal', '40901025', id, 'exame', 'ambulatorial', 20, 'media', true
FROM especialidades_medicas WHERE nome = 'Ginecologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

-- Inserir procedimentos de Dermatologia
INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Consulta Dermatológica', '10101071', id, 'consulta', 'ambulatorial', 30, 'media', true
FROM especialidades_medicas WHERE nome = 'Dermatologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Biópsia de Pele', '31301010', id, 'procedimento', 'ambulatorial', 20, 'media', true
FROM especialidades_medicas WHERE nome = 'Dermatologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Cauterização de Lesões', '31301029', id, 'procedimento', 'ambulatorial', 15, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Dermatologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

-- Inserir procedimentos de Oftalmologia
INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Consulta Oftalmológica', '10101080', id, 'consulta', 'ambulatorial', 30, 'media', true
FROM especialidades_medicas WHERE nome = 'Oftalmologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Exame de Fundo de Olho', '40201015', id, 'exame', 'ambulatorial', 15, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Oftalmologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Teste de Acuidade Visual', '40201023', id, 'exame', 'ambulatorial', 10, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Oftalmologia'
ON CONFLICT (codigo_tuss) DO NOTHING;

-- Inserir procedimentos de Clínica Médica
INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Consulta Clínica Geral', '10101098', id, 'consulta', 'ambulatorial', 30, 'media', true
FROM especialidades_medicas WHERE nome = 'Clínica Médica'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Check-up Completo', '10101101', id, 'consulta', 'ambulatorial', 60, 'media', true
FROM especialidades_medicas WHERE nome = 'Clínica Médica'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Hemograma Completo', '40301010', id, 'exame', 'ambulatorial', 10, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Clínica Médica'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Glicemia em Jejum', '40301028', id, 'exame', 'ambulatorial', 5, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Clínica Médica'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Perfil Lipídico', '40301036', id, 'exame', 'ambulatorial', 10, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Clínica Médica'
ON CONFLICT (codigo_tuss) DO NOTHING;

INSERT INTO public.procedimentos (nome, codigo_tuss, especialidade_id, categoria, tipo, duracao_media, complexidade, ativo)
SELECT 'Raio-X de Tórax', '40301150', id, 'exame', 'ambulatorial', 15, 'baixa', true
FROM especialidades_medicas WHERE nome = 'Clínica Médica'
ON CONFLICT (codigo_tuss) DO NOTHING;

-- Procedimentos gerais (sem especialidade específica)
INSERT INTO public.procedimentos (nome, codigo_tuss, categoria, tipo, duracao_media, complexidade, ativo)
VALUES 
  ('Aferição de Pressão Arterial', '30101027', 'procedimento', 'ambulatorial', 5, 'baixa', true),
  ('Curativo Simples', '51301012', 'procedimento', 'ambulatorial', 10, 'baixa', true),
  ('Aplicação de Injeção IM/EV', '30301011', 'procedimento', 'ambulatorial', 5, 'baixa', true),
  ('Teste Rápido COVID-19', '40301168', 'exame', 'ambulatorial', 15, 'baixa', true),
  ('Teste Rápido HIV', '40301176', 'exame', 'ambulatorial', 15, 'baixa', true)
ON CONFLICT (codigo_tuss) DO NOTHING;

-- 4. CRIAR FUNÇÕES SQL
-- =====================================================

-- Função: get_servicos_por_credenciado
CREATE OR REPLACE FUNCTION public.get_servicos_por_credenciado(
  p_credenciado_id UUID
)
RETURNS TABLE (
  servico_id UUID,
  credenciado_id UUID,
  credenciado_nome TEXT,
  procedimento_id UUID,
  procedimento_nome TEXT,
  procedimento_codigo TEXT,
  procedimento_categoria TEXT,
  especialidade_id UUID,
  especialidade_nome TEXT,
  profissional_id UUID,
  profissional_nome TEXT,
  profissional_crm TEXT,
  preco_base NUMERIC,
  preco_particular NUMERIC,
  preco_convenio NUMERIC,
  aceita_sus BOOLEAN,
  disponivel BOOLEAN,
  disponivel_online BOOLEAN,
  local_atendimento TEXT,
  dias_atendimento TEXT[],
  horario_inicio TIME,
  horario_fim TIME,
  observacoes TEXT,
  tempo_espera_medio INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cs.id AS servico_id,
    c.id AS credenciado_id,
    c.nome AS credenciado_nome,
    p.id AS procedimento_id,
    p.nome AS procedimento_nome,
    p.codigo_tuss AS procedimento_codigo,
    p.categoria AS procedimento_categoria,
    e.id AS especialidade_id,
    e.nome AS especialidade_nome,
    prof.id AS profissional_id,
    prof.nome AS profissional_nome,
    prof.crm AS profissional_crm,
    cs.preco_base,
    cs.preco_particular,
    cs.preco_convenio,
    cs.aceita_sus,
    cs.disponivel,
    cs.disponivel_online,
    cs.local_atendimento,
    cs.dias_atendimento,
    cs.horario_inicio,
    cs.horario_fim,
    cs.observacoes,
    cs.tempo_espera_medio
  FROM public.credenciado_servicos cs
  JOIN public.credenciados c ON c.id = cs.credenciado_id
  JOIN public.procedimentos p ON p.id = cs.procedimento_id
  LEFT JOIN public.especialidades_medicas e ON e.id = p.especialidade_id
  LEFT JOIN public.profissionais_credenciados prof ON prof.id = cs.profissional_id
  WHERE cs.credenciado_id = p_credenciado_id
    AND cs.disponivel = true
    AND p.ativo = true
  ORDER BY 
    e.nome NULLS LAST,
    p.categoria,
    cs.prioridade DESC,
    p.nome;
$$;

COMMENT ON FUNCTION public.get_servicos_por_credenciado IS 'Retorna todos os serviços ofertados por um credenciado específico';

-- Função: buscar_servicos_rede
CREATE OR REPLACE FUNCTION public.buscar_servicos_rede(
  p_especialidade TEXT DEFAULT NULL,
  p_procedimento TEXT DEFAULT NULL,
  p_categoria TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_aceita_sus BOOLEAN DEFAULT NULL,
  p_disponivel_online BOOLEAN DEFAULT NULL,
  p_preco_maximo NUMERIC DEFAULT NULL
)
RETURNS TABLE (
  servico_id UUID,
  credenciado_id UUID,
  credenciado_nome TEXT,
  credenciado_cnpj TEXT,
  credenciado_endereco TEXT,
  cidade TEXT,
  estado TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  especialidade TEXT,
  procedimento TEXT,
  procedimento_codigo TEXT,
  categoria TEXT,
  profissional_nome TEXT,
  profissional_crm TEXT,
  preco_base NUMERIC,
  preco_particular NUMERIC,
  aceita_sus BOOLEAN,
  disponivel_online BOOLEAN,
  tempo_espera_medio INTEGER,
  local_atendimento TEXT,
  observacoes TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cs.id AS servico_id,
    c.id AS credenciado_id,
    c.nome AS credenciado_nome,
    c.cnpj AS credenciado_cnpj,
    c.endereco AS credenciado_endereco,
    c.cidade,
    c.estado,
    c.latitude,
    c.longitude,
    e.nome AS especialidade,
    p.nome AS procedimento,
    p.codigo_tuss AS procedimento_codigo,
    p.categoria,
    prof.nome AS profissional_nome,
    prof.crm AS profissional_crm,
    cs.preco_base,
    cs.preco_particular,
    cs.aceita_sus,
    cs.disponivel_online,
    cs.tempo_espera_medio,
    cs.local_atendimento,
    cs.observacoes
  FROM public.credenciado_servicos cs
  JOIN public.credenciados c ON c.id = cs.credenciado_id
  JOIN public.procedimentos p ON p.id = cs.procedimento_id
  LEFT JOIN public.especialidades_medicas e ON e.id = p.especialidade_id
  LEFT JOIN public.profissionais_credenciados prof ON prof.id = cs.profissional_id
  WHERE 
    cs.disponivel = true
    AND p.ativo = true
    AND c.status = 'Ativo'
    AND (p_especialidade IS NULL OR e.nome ILIKE '%' || p_especialidade || '%')
    AND (p_procedimento IS NULL OR p.nome ILIKE '%' || p_procedimento || '%')
    AND (p_categoria IS NULL OR p.categoria = p_categoria)
    AND (p_cidade IS NULL OR c.cidade ILIKE '%' || p_cidade || '%')
    AND (p_estado IS NULL OR c.estado = p_estado)
    AND (p_aceita_sus IS NULL OR cs.aceita_sus = p_aceita_sus)
    AND (p_disponivel_online IS NULL OR cs.disponivel_online = p_disponivel_online)
    AND (p_preco_maximo IS NULL OR cs.preco_base <= p_preco_maximo OR cs.preco_base IS NULL)
  ORDER BY 
    c.cidade,
    e.nome NULLS LAST,
    p.nome,
    cs.preco_base NULLS LAST;
$$;

COMMENT ON FUNCTION public.buscar_servicos_rede IS 'Busca geral de serviços na rede credenciada com múltiplos filtros';

-- 5. CONFIGURAR RLS POLICIES
-- =====================================================

-- RLS para procedimentos
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver procedimentos ativos"
  ON public.procedimentos FOR SELECT
  USING (ativo = true);

CREATE POLICY "Gestores podem gerenciar procedimentos"
  ON public.procedimentos FOR ALL
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS para credenciado_servicos
ALTER TABLE public.credenciado_servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver serviços disponíveis"
  ON public.credenciado_servicos FOR SELECT
  USING (disponivel = true);

CREATE POLICY "Credenciados podem gerenciar seus serviços"
  ON public.credenciado_servicos FOR ALL
  USING (
    credenciado_id IN (
      SELECT c.id FROM credenciados c
      JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
      WHERE ie.candidato_id = auth.uid()
    )
    OR has_role(auth.uid(), 'gestor'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Gestores podem gerenciar todos os serviços"
  ON public.credenciado_servicos FOR ALL
  USING (
    has_role(auth.uid(), 'gestor'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 6. VIEW MATERIALIZADA (OPCIONAL - PARA PERFORMANCE)
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_catalogo_servicos AS
SELECT
  cs.id,
  cs.credenciado_id,
  c.nome AS credenciado_nome,
  c.cidade,
  c.estado,
  p.id AS procedimento_id,
  p.nome AS procedimento_nome,
  p.categoria,
  e.nome AS especialidade_nome,
  cs.preco_base,
  cs.disponivel,
  cs.disponivel_online,
  cs.aceita_sus,
  to_tsvector('portuguese', 
    COALESCE(p.nome, '') || ' ' || 
    COALESCE(e.nome, '') || ' ' || 
    COALESCE(c.nome, '') || ' ' ||
    COALESCE(c.cidade, '')
  ) AS search_vector
FROM credenciado_servicos cs
JOIN credenciados c ON c.id = cs.credenciado_id
JOIN procedimentos p ON p.id = cs.procedimento_id
LEFT JOIN especialidades_medicas e ON e.id = p.especialidade_id
WHERE cs.disponivel = true AND p.ativo = true;

CREATE INDEX IF NOT EXISTS idx_mv_catalogo_search ON mv_catalogo_servicos USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_mv_catalogo_cidade ON mv_catalogo_servicos(cidade);
CREATE INDEX IF NOT EXISTS idx_mv_catalogo_especialidade ON mv_catalogo_servicos(especialidade_nome);

-- Função para refresh da view materializada
CREATE OR REPLACE FUNCTION refresh_catalogo_servicos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_catalogo_servicos;
END;
$$;