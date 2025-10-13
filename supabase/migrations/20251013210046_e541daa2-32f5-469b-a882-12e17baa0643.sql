-- Função para buscar contratos pendentes sem signature_request
CREATE OR REPLACE FUNCTION public.get_contratos_sem_signature_request()
RETURNS TABLE (
  id uuid,
  inscricao_id uuid,
  numero_contrato text,
  dados_contrato jsonb,
  dados_inscricao jsonb
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.inscricao_id,
    c.numero_contrato,
    c.dados_contrato,
    ie.dados_inscricao
  FROM public.contratos c
  LEFT JOIN public.signature_requests sr ON sr.contrato_id = c.id
  INNER JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
  WHERE c.status = 'pendente_assinatura'
    AND sr.id IS NULL
  ORDER BY c.created_at ASC
  LIMIT 50;
END;
$$;