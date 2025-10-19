-- Criar função RPC para estatísticas do Assinafy
CREATE OR REPLACE FUNCTION public.get_assinafy_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total', COUNT(*)::integer,
    'pending', COUNT(*) FILTER (WHERE status = 'pending')::integer,
    'signed', COUNT(*) FILTER (WHERE status = 'signed')::integer,
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected')::integer,
    'expired', COUNT(*) FILTER (WHERE status = 'expired')::integer,
    'failed', COUNT(*) FILTER (WHERE status = 'failed')::integer,
    'last_updated', MAX(updated_at)
  ) INTO result
  FROM public.signature_requests
  WHERE provider = 'assinafy'
    AND created_at > NOW() - INTERVAL '30 days';
  
  RETURN COALESCE(result, json_build_object(
    'total', 0,
    'pending', 0,
    'signed', 0,
    'rejected', 0,
    'expired', 0,
    'failed', 0,
    'last_updated', NULL
  ));
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_assinafy_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_assinafy_stats() TO anon;