-- Passo 1: Adicionar delay no trigger de criação de contrato
CREATE OR REPLACE FUNCTION public.create_contrato_on_aprovacao()
RETURNS TRIGGER AS $$
DECLARE
  v_numero_contrato TEXT;
BEGIN
  IF NEW.status = 'aprovado' AND (OLD IS NULL OR OLD.status != 'aprovado') THEN
    v_numero_contrato := 'CONT-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    INSERT INTO public.contratos (
      inscricao_id,
      analise_id,
      numero_contrato,
      status,
      dados_contrato
    )
    VALUES (
      NEW.inscricao_id,
      NEW.id,
      v_numero_contrato,
      'pendente_assinatura',
      jsonb_build_object(
        'tipo', 'credenciamento',
        'data_geracao', now()
      )
    )
    ON CONFLICT (inscricao_id) DO NOTHING;
    
    -- ⏱️ Aguardar 2s para garantir commit do contrato no banco
    PERFORM pg_sleep(2);
    
    RAISE NOTICE '[FLUXO] Contrato % criado, aguardando processamento...', v_numero_contrato;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Passo 4: Melhorar RPC para filtrar contratos com idade mínima
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
    AND c.dados_contrato ? 'html'
    AND c.dados_contrato->>'html' IS NOT NULL
    AND LENGTH(c.dados_contrato->>'html') > 0
    AND c.created_at < (NOW() - INTERVAL '5 seconds') -- ⏱️ Filtrar contratos recém-criados
  ORDER BY c.created_at ASC
  LIMIT 50;
END;
$$;