-- Fase 1: Limpar contratos órfãos sem HTML
DELETE FROM signature_requests 
WHERE contrato_id IN (
  SELECT id FROM contratos 
  WHERE dados_contrato->>'html' IS NULL
);

DELETE FROM contratos 
WHERE dados_contrato->>'html' IS NULL;

-- Fase 2: Melhorar trigger para usar UPSERT
CREATE OR REPLACE FUNCTION public.create_contrato_on_aprovacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_numero_contrato TEXT;
  v_contrato_id UUID;
BEGIN
  IF NEW.status = 'aprovado' AND (OLD IS NULL OR OLD.status != 'aprovado') THEN
    v_numero_contrato := 'CONT-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    -- Log de tentativa
    RAISE NOTICE '[CONTRATO] Tentando criar/atualizar contrato para inscrição % (análise %)', NEW.inscricao_id, NEW.id;
    
    -- UPSERT: Criar ou atualizar se já existir
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
    ON CONFLICT (inscricao_id) 
    DO UPDATE SET
      status = EXCLUDED.status,
      analise_id = EXCLUDED.analise_id,
      updated_at = NOW()
    RETURNING id INTO v_contrato_id;
    
    RAISE NOTICE '[CONTRATO] Contrato % criado/atualizado para inscrição %', v_contrato_id, NEW.inscricao_id;
    
    -- ⏱️ Aguardar 2s para garantir commit do contrato no banco
    PERFORM pg_sleep(2);
    
    RAISE NOTICE '[CONTRATO] Aguardando processamento do contrato %...', v_numero_contrato;
  END IF;
  
  RETURN NEW;
END;
$function$;