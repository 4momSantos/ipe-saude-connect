-- Re-habilitar trigger de criação de contrato após aprovação
-- Este trigger garante que toda aprovação gere automaticamente um contrato

DO $$
BEGIN
  -- Habilitar o trigger se existir mas estiver desabilitado
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'trigger_ensure_contrato_on_aprovacao'
      AND tgenabled = 'D'
  ) THEN
    ALTER TABLE public.analises 
    ENABLE TRIGGER trigger_ensure_contrato_on_aprovacao;
    
    RAISE NOTICE '✅ Trigger trigger_ensure_contrato_on_aprovacao reabilitado';
  ELSE
    RAISE NOTICE 'ℹ️  Trigger trigger_ensure_contrato_on_aprovacao já está habilitado ou não existe';
  END IF;
  
  -- Remover trigger duplicado antigo se existir
  IF EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'trigger_create_contrato_on_aprovacao'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_create_contrato_on_aprovacao ON public.analises;
    RAISE NOTICE '🗑️  Trigger duplicado trigger_create_contrato_on_aprovacao removido';
  END IF;
END $$;