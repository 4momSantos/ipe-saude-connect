-- Corrigir função buscar_usuarios_para_mencao com tipos explícitos
CREATE OR REPLACE FUNCTION public.buscar_usuarios_para_mencao(
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
        COALESCE(p.nome, u.email)::TEXT AS nome,
        u.email::TEXT,
        COALESCE(
            (SELECT string_agg(ur.role::text, ',') 
             FROM user_roles ur 
             WHERE ur.user_id = u.id),
            'candidato'
        )::TEXT AS papel
    FROM auth.users u
    LEFT JOIN profiles p ON p.id = u.id
    WHERE 
        u.id IN (
            SELECT DISTINCT sender_id 
            FROM workflow_messages 
            WHERE inscricao_id = p_inscricao_id
        )
        OR
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