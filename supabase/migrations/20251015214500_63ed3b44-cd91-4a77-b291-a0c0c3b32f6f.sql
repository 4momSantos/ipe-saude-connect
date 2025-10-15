-- ============================================
-- FIX SECURITY ISSUES: auth.users exposed via views
-- ============================================

-- 1. DROP views que expõem auth.users diretamente
DROP VIEW IF EXISTS public.v_usuarios_com_grupos CASCADE;
DROP VIEW IF EXISTS public.v_grupos_com_membros CASCADE;

-- 2. RECRIAR views usando public.profiles (seguro com RLS)
CREATE VIEW public.v_usuarios_com_grupos AS
SELECT 
  p.id AS usuario_id,
  p.email,
  p.nome,
  COALESCE(
    json_agg(
      json_build_object(
        'grupo_id', g.id,
        'grupo_nome', g.nome,
        'papel', ug.papel,
        'adicionado_em', ug.adicionado_em
      )
    ) FILTER (WHERE g.id IS NOT NULL),
    '[]'::json
  ) AS grupos,
  COUNT(g.id) FILTER (WHERE ug.ativo = true) AS total_grupos_ativos
FROM public.profiles p
LEFT JOIN usuarios_grupos ug ON ug.usuario_id = p.id AND ug.ativo = true
LEFT JOIN grupos_usuarios g ON g.id = ug.grupo_id AND g.ativo = true
GROUP BY p.id, p.email, p.nome;

CREATE VIEW public.v_grupos_com_membros AS
SELECT 
  g.id AS grupo_id,
  g.nome AS grupo_nome,
  g.descricao,
  g.tipo,
  g.ativo,
  COALESCE(
    json_agg(
      json_build_object(
        'usuario_id', p.id,
        'email', p.email,
        'nome', p.nome,
        'papel', ug.papel,
        'ativo', ug.ativo
      )
    ) FILTER (WHERE p.id IS NOT NULL),
    '[]'::json
  ) AS membros,
  COUNT(p.id) FILTER (WHERE ug.ativo = true) AS total_membros_ativos
FROM grupos_usuarios g
LEFT JOIN usuarios_grupos ug ON ug.grupo_id = g.id
LEFT JOIN public.profiles p ON p.id = ug.usuario_id
GROUP BY g.id, g.nome, g.descricao, g.tipo, g.ativo;

-- Comentários explicativos
COMMENT ON VIEW public.v_usuarios_com_grupos IS 
'View segura que usa profiles (com RLS) em vez de auth.users';

COMMENT ON VIEW public.v_grupos_com_membros IS 
'View segura que usa profiles (com RLS) em vez de auth.users';
