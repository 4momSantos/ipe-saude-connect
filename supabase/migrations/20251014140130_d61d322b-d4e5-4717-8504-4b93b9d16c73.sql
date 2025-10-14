-- ============================================================================
-- CORREÇÃO IMEDIATA: Processar contratos órfãos com IDs corretos
-- ============================================================================

DO $$
DECLARE
  v_credenciado_id UUID;
BEGIN
  -- Contrato 1: CONT-2025-885299 (inscricao_id: 3fb7aea7-9347-43df-a4fc-569f32e4aabe)
  BEGIN
    RAISE NOTICE '[FIX_ORFAO] Processando contrato CONT-2025-885299...';
    v_credenciado_id := sync_approved_inscricao_to_credenciado_v2('3fb7aea7-9347-43df-a4fc-569f32e4aabe');
    RAISE NOTICE '[FIX_ORFAO] ✅ Credenciado % criado para CONT-2025-885299', v_credenciado_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[FIX_ORFAO] ❌ Erro ao processar CONT-2025-885299: %', SQLERRM;
  END;
  
  -- Contrato 2: CONT-2025-459425 (inscricao_id: 01f9df51-b65e-4966-8f55-06a63e0e22ba)
  BEGIN
    RAISE NOTICE '[FIX_ORFAO] Processando contrato CONT-2025-459425...';
    v_credenciado_id := sync_approved_inscricao_to_credenciado_v2('01f9df51-b65e-4966-8f55-06a63e0e22ba');
    RAISE NOTICE '[FIX_ORFAO] ✅ Credenciado % criado para CONT-2025-459425', v_credenciado_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[FIX_ORFAO] ❌ Erro ao processar CONT-2025-459425: %', SQLERRM;
  END;
  
  RAISE NOTICE '[FIX_ORFAO] 🎉 Processamento de contratos órfãos concluído!';
END $$;