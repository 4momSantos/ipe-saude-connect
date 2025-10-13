-- Atualizar função para filtrar apenas contratos com HTML válido
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
    AND c.dados_contrato ? 'html'  -- Verifica se chave 'html' existe no JSONB
    AND c.dados_contrato->>'html' IS NOT NULL
    AND LENGTH(c.dados_contrato->>'html') > 0
  ORDER BY c.created_at ASC
  LIMIT 50;
END;
$$;