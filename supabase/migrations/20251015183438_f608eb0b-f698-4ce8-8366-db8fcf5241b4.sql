-- ============================================
-- SISTEMA DE CATEGORIAS DE ESTABELECIMENTOS
-- ============================================

-- 1. CRIAR TABELA categorias_estabelecimentos
CREATE TABLE IF NOT EXISTS public.categorias_estabelecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT UNIQUE NOT NULL,
  codigo TEXT UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE categorias_estabelecimentos IS 
  'Categorias de estabelecimentos (ex: Clínica, Hospital, Laboratório)';

-- Índice para busca por nome
CREATE INDEX IF NOT EXISTS idx_categorias_estabelecimentos_nome 
ON categorias_estabelecimentos(nome);

-- 2. CRIAR TABELA RELACIONAL credenciado_categorias (N:N)
CREATE TABLE IF NOT EXISTS public.credenciado_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES credenciados(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias_estabelecimentos(id) ON DELETE CASCADE,
  principal BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT now(),
  UNIQUE (credenciado_id, categoria_id)
);

COMMENT ON TABLE credenciado_categorias IS 
  'Relação N:N entre credenciados e categorias de estabelecimentos';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_credenciado_categorias_credenciado
ON credenciado_categorias (credenciado_id);

CREATE INDEX IF NOT EXISTS idx_credenciado_categorias_categoria
ON credenciado_categorias (categoria_id);

CREATE INDEX IF NOT EXISTS idx_credenciado_categorias_principal
ON credenciado_categorias (credenciado_id, principal)
WHERE principal = true;

-- 3. SEED DATA - Categorias Padrão
INSERT INTO categorias_estabelecimentos (nome, codigo, descricao) VALUES
  ('Clínica', 'CLI', 'Clínicas médicas e ambulatoriais'),
  ('Hospital', 'HOSP', 'Hospitais e centros hospitalares'),
  ('Laboratório', 'LAB', 'Laboratórios de análises clínicas'),
  ('Centro de Diagnóstico', 'DIAG', 'Centros de diagnóstico por imagem'),
  ('Consultório', 'CONS', 'Consultórios médicos individuais'),
  ('Pronto Atendimento', 'PA', 'Unidades de pronto atendimento'),
  ('Centro Cirúrgico', 'CC', 'Centros cirúrgicos especializados'),
  ('Farmácia', 'FARM', 'Farmácias e drogarias')
ON CONFLICT (nome) DO NOTHING;

-- 4. FUNÇÕES SQL AUXILIARES

-- 4.1 Listar categorias de um credenciado
CREATE OR REPLACE FUNCTION public.get_categorias_por_credenciado(p_credenciado_id UUID)
RETURNS TABLE (
  categoria_id UUID,
  categoria_nome TEXT,
  categoria_codigo TEXT,
  principal BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ce.id AS categoria_id,
    ce.nome AS categoria_nome,
    ce.codigo AS categoria_codigo,
    cc.principal
  FROM credenciado_categorias cc
  JOIN categorias_estabelecimentos ce ON ce.id = cc.categoria_id
  WHERE cc.credenciado_id = p_credenciado_id
    AND ce.ativo = true
  ORDER BY cc.principal DESC, ce.nome;
$$;

-- 4.2 Buscar credenciados por categoria
CREATE OR REPLACE FUNCTION public.buscar_credenciados_por_categoria(
  p_categoria TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL
)
RETURNS TABLE (
  credenciado_id UUID,
  nome TEXT,
  cnpj TEXT,
  cidade TEXT,
  estado TEXT,
  categoria TEXT,
  categoria_codigo TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    c.id,
    c.nome,
    c.cnpj,
    c.cidade,
    c.estado,
    ce.nome AS categoria,
    ce.codigo AS categoria_codigo,
    c.latitude,
    c.longitude
  FROM credenciados c
  JOIN credenciado_categorias cc ON cc.credenciado_id = c.id
  JOIN categorias_estabelecimentos ce ON ce.id = cc.categoria_id
  WHERE 
    c.status = 'Ativo'
    AND ce.ativo = true
    AND (p_categoria IS NULL OR ce.nome ILIKE '%' || p_categoria || '%' OR ce.codigo = p_categoria)
    AND (p_estado IS NULL OR c.estado = p_estado)
    AND (p_cidade IS NULL OR c.cidade ILIKE '%' || p_cidade || '%')
  ORDER BY ce.nome, c.nome;
$$;

-- 4.3 Trigger para garantir apenas 1 categoria principal por credenciado
CREATE OR REPLACE FUNCTION ensure_single_principal_categoria()
RETURNS TRIGGER AS $$
BEGIN
  -- Se está marcando como principal, desmarcar as outras
  IF NEW.principal = true THEN
    UPDATE credenciado_categorias
    SET principal = false
    WHERE credenciado_id = NEW.credenciado_id
      AND id != NEW.id
      AND principal = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_principal
BEFORE INSERT OR UPDATE ON credenciado_categorias
FOR EACH ROW
EXECUTE FUNCTION ensure_single_principal_categoria();

-- 5. RLS POLICIES

-- Habilitar RLS
ALTER TABLE categorias_estabelecimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE credenciado_categorias ENABLE ROW LEVEL SECURITY;

-- Todos podem ver categorias ativas
CREATE POLICY "Todos podem ver categorias ativas"
ON categorias_estabelecimentos FOR SELECT
TO authenticated
USING (ativo = true);

-- Gestores podem gerenciar categorias
CREATE POLICY "Gestores gerenciam categorias"
ON categorias_estabelecimentos FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('gestor', 'admin')
  )
);

-- Gestores e credenciados podem ver vínculos
CREATE POLICY "Ver vínculos de categorias"
ON credenciado_categorias FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('gestor', 'admin', 'analista')
  )
  OR
  EXISTS (
    SELECT 1 FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = credenciado_categorias.credenciado_id
    AND ie.candidato_id = auth.uid()
  )
);

-- Gestores podem gerenciar vínculos
CREATE POLICY "Gestores gerenciam vínculos"
ON credenciado_categorias FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND role IN ('gestor', 'admin')
  )
);