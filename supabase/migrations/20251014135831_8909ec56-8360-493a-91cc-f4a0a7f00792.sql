-- ============================================================================
-- FASE 7: Remover UNIQUE constraint de CPF e permitir múltiplos credenciamentos
-- ============================================================================

-- 1. Remover constraint UNIQUE do CPF
ALTER TABLE public.credenciados DROP CONSTRAINT IF EXISTS credenciados_cpf_key;

-- 2. Criar índice não-único para performance em consultas por CPF
CREATE INDEX IF NOT EXISTS idx_credenciados_cpf ON public.credenciados(cpf) WHERE cpf IS NOT NULL;

-- 3. Atualizar comentário da coluna
COMMENT ON COLUMN public.credenciados.cpf IS 'CPF do credenciado. Permite múltiplos credenciamentos por CPF (ex: especialidades diferentes).';

-- 4. Reprocessar os 2 contratos travados
DO $$
DECLARE
  v_inscricao_1 UUID := 'fd8a2d2c-7f7d-4eea-b7b6-3b0c1c3c9c3c'; -- IPE-2025-00004
  v_inscricao_2 UUID := 'f9a2d2c7-7f7d-4eea-b7b6-3b0c1c3c9c3c'; -- IPE-2025-00001
  v_credenciado_id UUID;
BEGIN
  -- Reprocessar inscrição 1
  BEGIN
    RAISE NOTICE '[REPROCESSAMENTO] Processando inscrição %', v_inscricao_1;
    v_credenciado_id := sync_approved_inscricao_to_credenciado_v2(v_inscricao_1);
    RAISE NOTICE '[REPROCESSAMENTO] ✅ Credenciado % criado para inscrição %', v_credenciado_id, v_inscricao_1;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[REPROCESSAMENTO] ❌ Erro ao processar inscrição %: %', v_inscricao_1, SQLERRM;
  END;
  
  -- Reprocessar inscrição 2
  BEGIN
    RAISE NOTICE '[REPROCESSAMENTO] Processando inscrição %', v_inscricao_2;
    v_credenciado_id := sync_approved_inscricao_to_credenciado_v2(v_inscricao_2);
    RAISE NOTICE '[REPROCESSAMENTO] ✅ Credenciado % criado para inscrição %', v_credenciado_id, v_inscricao_2;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[REPROCESSAMENTO] ❌ Erro ao processar inscrição %: %', v_inscricao_2, SQLERRM;
  END;
  
  RAISE NOTICE '[REPROCESSAMENTO] Processo concluído!';
END $$;