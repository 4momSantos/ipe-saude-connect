-- Corrigir trigger de criação de contrato
-- O trigger agora apenas cria um registro básico de contrato
-- A edge function gerar-contrato-assinatura é responsável por:
-- 1. Gerar HTML do contrato
-- 2. Criar signature_request
-- 3. Enviar para assinatura

CREATE OR REPLACE FUNCTION public.create_contrato_on_aprovacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_numero_contrato TEXT;
  v_contrato_id UUID;
  v_contrato_existente UUID;
BEGIN
  IF NEW.status = 'aprovado' AND (OLD IS NULL OR OLD.status != 'aprovado') THEN
    
    -- Verificar se já existe contrato para esta inscrição
    SELECT id INTO v_contrato_existente
    FROM public.contratos
    WHERE inscricao_id = NEW.inscricao_id;
    
    IF v_contrato_existente IS NOT NULL THEN
      RAISE NOTICE '[CONTRATO] Contrato já existe para inscrição %', NEW.inscricao_id;
      RETURN NEW;
    END IF;
    
    -- Gerar número único de contrato
    v_numero_contrato := 'CONT-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    RAISE NOTICE '[CONTRATO] Criando contrato % para inscrição %', v_numero_contrato, NEW.inscricao_id;
    
    -- Criar contrato básico (sem HTML ainda)
    -- O HTML será gerado pela edge function gerar-contrato-assinatura
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
        'data_geracao', now(),
        'requer_processamento', true
      )
    )
    RETURNING id INTO v_contrato_id;
    
    RAISE NOTICE '[CONTRATO] ✅ Contrato % criado. Use o dashboard para enviar para assinatura.', v_numero_contrato;
  END IF;
  
  RETURN NEW;
END;
$$;