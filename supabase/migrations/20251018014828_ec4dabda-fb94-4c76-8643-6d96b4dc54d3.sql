-- ============================================
-- CORREÇÃO DO FLUXO: CREDENCIADO SÓ APÓS ASSINATURA
-- ============================================
-- 
-- PROBLEMA: Trigger criava credenciado na aprovação, pulando etapa de assinatura
-- SOLUÇÃO: Desabilitar trigger de aprovação, manter apenas trigger de assinatura
--
-- FLUXO CORRETO:
-- 1. Análise aprovada → status = 'aprovado'
-- 2. Gerar contrato → contratos table
-- 3. Enviar para assinatura → signature_requests + email
-- 4. Candidato assina → contrato.status = 'assinado'
-- 5. Criar credenciado → trigger_activate_credenciado_on_assinatura
-- ============================================

-- Desabilitar trigger que cria credenciado na aprovação
DROP TRIGGER IF EXISTS trigger_sync_approved_to_credenciado ON public.inscricoes_edital;

-- A função sync_approved_inscricao_to_credenciado() permanece disponível
-- para uso manual via botão de correção se necessário