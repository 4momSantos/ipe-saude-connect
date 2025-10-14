-- ========================================
-- TABELA: grupos_usuarios
-- ========================================
CREATE TABLE IF NOT EXISTS public.grupos_usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    tipo TEXT NOT NULL, -- 'analista', 'gestor', 'aprovador', 'admin'
    
    -- Permissões do grupo
    permissoes JSONB DEFAULT '{
        "pode_aprovar": false,
        "pode_reprovar": false,
        "pode_solicitar_correcao": false,
        "pode_reatribuir": false,
        "pode_ver_historico_completo": false,
        "pode_editar_workflow": false
    }'::JSONB,
    
    -- UI
    cor_identificacao TEXT DEFAULT '#3b82f6',
    icone TEXT DEFAULT 'Users',
    
    -- Configurações
    ativo BOOLEAN DEFAULT TRUE,
    
    -- Auditoria
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_por UUID REFERENCES auth.users(id),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABELA: usuarios_grupos (relacionamento N:N)
-- ========================================
CREATE TABLE IF NOT EXISTS public.usuarios_grupos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES public.grupos_usuarios(id) ON DELETE CASCADE,
    
    -- Papel no grupo
    papel TEXT DEFAULT 'membro', -- 'membro', 'coordenador', 'supervisor'
    
    -- Estado
    ativo BOOLEAN DEFAULT TRUE,
    
    -- Metadados
    observacoes TEXT,
    
    -- Auditoria
    adicionado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    adicionado_por UUID REFERENCES auth.users(id),
    removido_em TIMESTAMP WITH TIME ZONE,
    removido_por UUID REFERENCES auth.users(id),
    
    UNIQUE(usuario_id, grupo_id)
);

-- ========================================
-- VIEW: Usuários com seus grupos
-- ========================================
CREATE OR REPLACE VIEW v_usuarios_com_grupos AS
SELECT 
    u.id AS usuario_id,
    u.email,
    u.raw_user_meta_data->>'name' AS nome,
    u.raw_user_meta_data->>'role' AS role_sistema,
    -- Agregação de grupos
    COALESCE(
        json_agg(
            json_build_object(
                'grupo_id', g.id,
                'grupo_nome', g.nome,
                'grupo_tipo', g.tipo,
                'papel', ug.papel,
                'cor', g.cor_identificacao,
                'permissoes', g.permissoes,
                'ativo', ug.ativo,
                'adicionado_em', ug.adicionado_em
            ) ORDER BY g.nome
        ) FILTER (WHERE g.id IS NOT NULL),
        '[]'::json
    ) AS grupos,
    COUNT(g.id) FILTER (WHERE ug.ativo = true) AS total_grupos_ativos
FROM auth.users u
LEFT JOIN usuarios_grupos ug ON ug.usuario_id = u.id AND ug.ativo = true
LEFT JOIN grupos_usuarios g ON g.id = ug.grupo_id AND g.ativo = true
GROUP BY u.id, u.email, u.raw_user_meta_data;

-- ========================================
-- VIEW: Grupos com seus membros
-- ========================================
CREATE OR REPLACE VIEW v_grupos_com_membros AS
SELECT 
    g.id AS grupo_id,
    g.nome AS grupo_nome,
    g.descricao,
    g.tipo,
    g.permissoes,
    g.cor_identificacao,
    g.ativo,
    g.criado_em,
    -- Agregação de usuários
    COALESCE(
        json_agg(
            json_build_object(
                'usuario_id', u.id,
                'email', u.email,
                'nome', u.raw_user_meta_data->>'name',
                'papel', ug.papel,
                'adicionado_em', ug.adicionado_em,
                'ativo', ug.ativo
            ) ORDER BY ug.adicionado_em
        ) FILTER (WHERE u.id IS NOT NULL),
        '[]'::json
    ) AS membros,
    COUNT(u.id) FILTER (WHERE ug.ativo = true) AS total_membros_ativos,
    COUNT(u.id) FILTER (WHERE ug.ativo = true AND ug.papel = 'coordenador') AS total_coordenadores
FROM grupos_usuarios g
LEFT JOIN usuarios_grupos ug ON ug.grupo_id = g.id
LEFT JOIN auth.users u ON u.id = ug.usuario_id
GROUP BY g.id;

-- ========================================
-- ÍNDICES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_usuarios_grupos_usuario 
    ON usuarios_grupos(usuario_id) WHERE ativo = true;
    
CREATE INDEX IF NOT EXISTS idx_usuarios_grupos_grupo 
    ON usuarios_grupos(grupo_id) WHERE ativo = true;
    
CREATE INDEX IF NOT EXISTS idx_grupos_usuarios_ativo 
    ON grupos_usuarios(ativo) WHERE ativo = true;

-- ========================================
-- TRIGGERS
-- ========================================
CREATE OR REPLACE FUNCTION update_grupos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grupos_updated_at
    BEFORE UPDATE ON grupos_usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_grupos_updated_at();

-- ========================================
-- RLS (Row Level Security)
-- ========================================
ALTER TABLE grupos_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_grupos ENABLE ROW LEVEL SECURITY;

-- Políticas para grupos_usuarios
DROP POLICY IF EXISTS "Todos podem ver grupos ativos" ON grupos_usuarios;
CREATE POLICY "Todos podem ver grupos ativos"
    ON grupos_usuarios FOR SELECT
    USING (ativo = true);

DROP POLICY IF EXISTS "Admins podem gerenciar grupos" ON grupos_usuarios;
CREATE POLICY "Admins podem gerenciar grupos"
    ON grupos_usuarios FOR ALL
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

-- Políticas para usuarios_grupos
DROP POLICY IF EXISTS "Usuários veem seus próprios grupos" ON usuarios_grupos;
CREATE POLICY "Usuários veem seus próprios grupos"
    ON usuarios_grupos FOR SELECT
    USING (
        usuario_id = auth.uid()
        OR has_role(auth.uid(), 'admin')
        OR has_role(auth.uid(), 'gestor')
    );

DROP POLICY IF EXISTS "Admins gerenciam membros dos grupos" ON usuarios_grupos;
CREATE POLICY "Admins gerenciam membros dos grupos"
    ON usuarios_grupos FOR ALL
    USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

-- ========================================
-- FUNÇÕES AUXILIARES
-- ========================================

-- Verificar se usuário pertence a um grupo
CREATE OR REPLACE FUNCTION usuario_pertence_grupo(
    p_usuario_id UUID,
    p_grupo_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM usuarios_grupos
        WHERE usuario_id = p_usuario_id
        AND grupo_id = p_grupo_id
        AND ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buscar permissões de um usuário (agregando todos os grupos)
CREATE OR REPLACE FUNCTION obter_permissoes_usuario(
    p_usuario_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_permissoes JSONB;
BEGIN
    SELECT jsonb_object_agg(
        key,
        bool_or(value::boolean)
    )
    INTO v_permissoes
    FROM usuarios_grupos ug
    JOIN grupos_usuarios g ON g.id = ug.grupo_id
    CROSS JOIN jsonb_each(g.permissoes)
    WHERE ug.usuario_id = p_usuario_id
    AND ug.ativo = true
    AND g.ativo = true
    GROUP BY key;
    
    RETURN COALESCE(v_permissoes, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- DADOS DE TESTE
-- ========================================
INSERT INTO grupos_usuarios (nome, descricao, tipo, permissoes, cor_identificacao) VALUES
('Analistas de Credenciamento', 'Responsáveis pela análise inicial de documentação', 'analista', 
 '{"pode_aprovar": true, "pode_reprovar": true, "pode_solicitar_correcao": true, "pode_reatribuir": false, "pode_ver_historico_completo": true, "pode_editar_workflow": false}'::jsonb,
 '#3b82f6'),
 
('Gestores Médicos', 'Gestores que aprovam credenciamentos após análise', 'gestor', 
 '{"pode_aprovar": true, "pode_reprovar": true, "pode_solicitar_correcao": true, "pode_reatribuir": true, "pode_ver_historico_completo": true, "pode_editar_workflow": true}'::jsonb,
 '#10b981'),
 
('Aprovadores Finais', 'Responsáveis pela aprovação final do processo', 'aprovador', 
 '{"pode_aprovar": true, "pode_reprovar": true, "pode_solicitar_correcao": false, "pode_reatribuir": false, "pode_ver_historico_completo": true, "pode_editar_workflow": false}'::jsonb,
 '#ef4444')
ON CONFLICT (nome) DO NOTHING;