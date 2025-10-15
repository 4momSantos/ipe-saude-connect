-- ========================================
-- MIGRAÇÃO: Expansão do Sistema de Mensagens
-- ========================================

-- 1. Adicionar novas colunas à tabela workflow_messages
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS etapa_id TEXT;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS etapa_nome TEXT;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS usuario_nome TEXT;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS usuario_email TEXT;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS usuario_papel TEXT DEFAULT 'candidato';
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'comentario';
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS mensagem TEXT;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS mensagem_html TEXT;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS mencoes UUID[];
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS visivel_para TEXT[] DEFAULT ARRAY['todos'];
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS privada BOOLEAN DEFAULT FALSE;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]'::JSONB;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS em_resposta_a UUID REFERENCES workflow_messages(id);
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS lido_por JSONB DEFAULT '[]'::JSONB;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS editada BOOLEAN DEFAULT FALSE;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS editada_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS deletada BOOLEAN DEFAULT FALSE;
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS deletada_em TIMESTAMP WITH TIME ZONE;

-- 2. Migrar dados existentes para nova estrutura
UPDATE workflow_messages 
SET 
  mensagem = content,
  usuario_nome = COALESCE((SELECT nome FROM profiles WHERE id = sender_id), 'Usuário'),
  usuario_email = COALESCE((SELECT email FROM profiles WHERE id = sender_id), ''),
  usuario_papel = CASE 
    WHEN sender_type = 'analista' THEN 'analista'
    WHEN sender_type = 'candidato' THEN 'candidato'
    ELSE 'candidato'
  END,
  tipo = 'comentario',
  visivel_para = ARRAY['todos']
WHERE mensagem IS NULL;

-- 3. Adicionar full-text search
ALTER TABLE workflow_messages ADD COLUMN IF NOT EXISTS busca_texto TSVECTOR 
  GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(mensagem, ''))) STORED;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_busca ON workflow_messages USING gin(busca_texto);
CREATE INDEX IF NOT EXISTS idx_messages_mencoes ON workflow_messages USING gin(mencoes);
CREATE INDEX IF NOT EXISTS idx_messages_tipo ON workflow_messages(tipo);
CREATE INDEX IF NOT EXISTS idx_messages_visivel ON workflow_messages USING gin(visivel_para);

-- 5. Criar tabela de anexos
CREATE TABLE IF NOT EXISTS anexos_mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    mensagem_id UUID REFERENCES workflow_messages(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL,
    nome_original TEXT NOT NULL,
    tamanho_bytes BIGINT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'workflow-anexos',
    url_publica TEXT,
    enviado_por UUID REFERENCES auth.users(id),
    enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    virus_scan_status TEXT DEFAULT 'pendente'
);

CREATE INDEX IF NOT EXISTS idx_anexos_mensagem ON anexos_mensagens(mensagem_id);

-- 6. Atualizar RLS Policies
DROP POLICY IF EXISTS "Users can view their own messages" ON workflow_messages;
DROP POLICY IF EXISTS "Users can insert messages" ON workflow_messages;
DROP POLICY IF EXISTS "Usuários veem mensagens permitidas" ON workflow_messages;

CREATE POLICY "Usuários veem mensagens permitidas"
ON workflow_messages FOR SELECT
USING (
    (deletada = FALSE OR deletada IS NULL)
    AND (
        sender_id = auth.uid() -- Próprias mensagens
        OR
        'todos' = ANY(visivel_para) -- Mensagens públicas
        OR
        EXISTS ( -- Mensagens para seu role
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role::text = ANY(visivel_para)
        )
        OR
        EXISTS ( -- Admin/gestor vê tudo
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'gestor')
        )
    )
);

CREATE POLICY "Usuários criam mensagens"
ON workflow_messages FOR INSERT
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Usuários editam próprias mensagens"
ON workflow_messages FOR UPDATE
USING (sender_id = auth.uid());

-- 7. RLS para anexos
ALTER TABLE anexos_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem anexos de mensagens visíveis"
ON anexos_mensagens FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM workflow_messages wm
        WHERE wm.id = anexos_mensagens.mensagem_id
        AND (
            wm.sender_id = auth.uid()
            OR 'todos' = ANY(wm.visivel_para)
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                WHERE ur.user_id = auth.uid()
                AND ur.role::text = ANY(wm.visivel_para)
            )
        )
    )
);

CREATE POLICY "Usuários criam anexos"
ON anexos_mensagens FOR INSERT
WITH CHECK (enviado_por = auth.uid());

-- 8. Função para marcar mensagem como lida
CREATE OR REPLACE FUNCTION marcar_mensagem_lida(
    p_mensagem_id UUID,
    p_usuario_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lido_por JSONB;
BEGIN
    SELECT lido_por INTO v_lido_por
    FROM workflow_messages
    WHERE id = p_mensagem_id;
    
    -- Se já está na lista de lidos, não faz nada
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_lido_por) elem
        WHERE elem->>'usuario_id' = p_usuario_id::text
    ) THEN
        RETURN FALSE;
    END IF;
    
    -- Adiciona à lista de lidos
    UPDATE workflow_messages
    SET lido_por = COALESCE(lido_por, '[]'::jsonb) || jsonb_build_object(
        'usuario_id', p_usuario_id,
        'lido_em', now()
    )::jsonb
    WHERE id = p_mensagem_id;
    
    RETURN TRUE;
END;
$$;

-- 9. Trigger para notificar menções
CREATE OR REPLACE FUNCTION notificar_mencoes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    usuario_mencionado UUID;
BEGIN
    IF NEW.mencoes IS NOT NULL AND array_length(NEW.mencoes, 1) > 0 THEN
        FOREACH usuario_mencionado IN ARRAY NEW.mencoes
        LOOP
            IF usuario_mencionado != NEW.sender_id THEN
                INSERT INTO app_notifications (
                    user_id, 
                    type, 
                    title, 
                    message,
                    related_type, 
                    related_id
                ) VALUES (
                    usuario_mencionado,
                    'info',
                    NEW.usuario_nome || ' mencionou você',
                    substring(NEW.mensagem, 1, 200),
                    'mensagem',
                    NEW.id
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notificar_mencoes ON workflow_messages;
CREATE TRIGGER trg_notificar_mencoes
    AFTER INSERT ON workflow_messages
    FOR EACH ROW
    EXECUTE FUNCTION notificar_mencoes();

-- 10. Função para buscar usuários para menção
CREATE OR REPLACE FUNCTION buscar_usuarios_para_mencao(
    p_inscricao_id UUID,
    p_termo TEXT DEFAULT ''
)
RETURNS TABLE (
    id UUID,
    nome TEXT,
    email TEXT,
    papel TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        u.id,
        COALESCE(p.nome, u.email) AS nome,
        u.email,
        COALESCE(
            (SELECT string_agg(ur.role::text, ',') 
             FROM user_roles ur 
             WHERE ur.user_id = u.id),
            'candidato'
        ) AS papel
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE 
        -- Já participou da conversa
        u.id IN (
            SELECT DISTINCT sender_id 
            FROM workflow_messages 
            WHERE inscricao_id = p_inscricao_id
        )
        OR
        -- Analistas e gestores do sistema
        u.id IN (
            SELECT ur.user_id
            FROM user_roles ur
            WHERE ur.role IN ('analista', 'gestor', 'admin')
        )
    AND (
        p_termo = ''
        OR u.email ILIKE '%' || p_termo || '%'
        OR p.nome ILIKE '%' || p_termo || '%'
    )
    ORDER BY nome
    LIMIT 10;
END;
$$;

-- 11. View para mensagens completas (facilita queries)
CREATE OR REPLACE VIEW v_mensagens_completas AS
SELECT 
    wm.*,
    resposta.mensagem as mensagem_original
FROM workflow_messages wm
LEFT JOIN workflow_messages resposta ON wm.em_resposta_a = resposta.id
WHERE wm.deletada = FALSE OR wm.deletada IS NULL;