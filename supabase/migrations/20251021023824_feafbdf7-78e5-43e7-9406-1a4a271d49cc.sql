-- ═══════════════════════════════════════════════════════════
-- ATUALIZAR TRIGGER: activate_credenciado_on_assinatura
-- Agora apenas delega para sync_credenciado_from_contract
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.activate_credenciado_on_assinatura()
RETURNS TRIGGER AS $$
BEGIN
  -- Só processa se status mudou para assinado
  IF NEW.status = 'assinado' AND (OLD IS NULL OR OLD.status != 'assinado') THEN
    
    RAISE NOTICE '[TRIGGER] Contrato % assinado, chamando sync_credenciado_from_contract', NEW.numero_contrato;
    
    -- Chamar função que extrai dados corretos do contrato
    PERFORM sync_credenciado_from_contract(NEW.inscricao_id);
    
    RAISE NOTICE '[TRIGGER] ✅ Credenciado sincronizado via sync_credenciado_from_contract';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';