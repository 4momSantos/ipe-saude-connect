-- Dropar função antiga e criar nova com signature_request_id
DROP FUNCTION IF EXISTS public.get_contratos_sem_signature_request();

CREATE FUNCTION public.get_contratos_sem_signature_request()
RETURNS TABLE(
  id uuid,
  inscricao_id uuid,
  numero_contrato text,
  dados_contrato jsonb,
  dados_inscricao jsonb,
  signature_request_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.inscricao_id,
    c.numero_contrato,
    c.dados_contrato,
    ie.dados_inscricao,
    sr.id as signature_request_id
  FROM public.contratos c
  LEFT JOIN public.signature_requests sr ON sr.contrato_id = c.id
  INNER JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
  WHERE c.status = 'pendente_assinatura'
    AND (
      sr.id IS NULL
      OR sr.status IN ('failed', 'error')
    )
    AND c.dados_contrato ? 'html'
    AND c.dados_contrato->>'html' IS NOT NULL
    AND LENGTH(c.dados_contrato->>'html') > 0
    AND c.created_at < (NOW() - INTERVAL '5 seconds')
  ORDER BY c.created_at ASC
  LIMIT 50;
END;
$function$;