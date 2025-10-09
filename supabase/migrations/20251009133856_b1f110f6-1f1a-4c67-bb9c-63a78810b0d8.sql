-- ============================================
-- CORREÇÃO: credenciado_historico_tipo_check
-- Adicionar 'Credenciamento' aos tipos permitidos
-- ============================================

-- Validar se existem registros com tipos inválidos (antes de alterar)
DO $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_invalid_count
  FROM public.credenciado_historico
  WHERE tipo NOT IN (
    'Credenciamento',
    'credenciamento',
    'Alteração Cadastral',
    'Alteração de Especialidade',
    'Alteração de Horários',
    'Suspensão',
    'Reativação',
    'Descredenciamento',
    'Auditoria',
    'Notificação',
    'Sanção'
  );
  
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Existem % registros com tipo inválido em credenciado_historico', v_invalid_count;
  END IF;
  
  RAISE NOTICE 'Validação OK: Nenhum registro com tipo inválido';
END $$;

-- Remover constraint antiga
ALTER TABLE public.credenciado_historico
DROP CONSTRAINT IF EXISTS credenciado_historico_tipo_check;

-- Criar nova constraint com 'Credenciamento' incluído
ALTER TABLE public.credenciado_historico
ADD CONSTRAINT credenciado_historico_tipo_check
CHECK (tipo IN (
  'Credenciamento',
  'credenciamento',
  'Alteração Cadastral',
  'Alteração de Especialidade',
  'Alteração de Horários',
  'Suspensão',
  'Reativação',
  'Descredenciamento',
  'Auditoria',
  'Notificação',
  'Sanção'
));

-- ============================================
-- RESULTADO
-- ============================================
-- ✅ Constraint agora aceita 'Credenciamento' (capitalizado)
-- ✅ Mantém compatibilidade com 'credenciamento' (lowercase)
-- ✅ Trigger sync_approved_inscricao_to_credenciado() agora funcionará
-- ============================================