-- =============================================
-- FASE 1: Corrigir Contratos Já Assinados
-- =============================================

-- Atualizar contratos que foram assinados mas não tiveram webhook processado
-- (identificados por signature_requests com external_status diferente de 'signed')
UPDATE contratos
SET 
  status = 'assinado',
  assinado_em = NOW(),
  updated_at = NOW()
WHERE id IN (
  SELECT c.id 
  FROM contratos c
  LEFT JOIN signature_requests sr ON sr.contrato_id = c.id
  WHERE c.status = 'pendente_assinatura'
    AND (
      sr.id IS NULL 
      OR (sr.external_status != 'signed' AND sr.created_at < NOW() - INTERVAL '10 minutes')
    )
    AND c.dados_contrato ? 'html'
    AND c.dados_contrato->>'html' IS NOT NULL
    AND LENGTH(c.dados_contrato->>'html') > 0
);

-- Ativar credenciados correspondentes aos contratos assinados
UPDATE credenciados
SET 
  status = 'Ativo',
  updated_at = NOW()
WHERE inscricao_id IN (
  SELECT inscricao_id 
  FROM contratos 
  WHERE status = 'assinado'
    AND inscricao_id IS NOT NULL
)
AND status != 'Ativo';

-- =============================================
-- FASE 2: Adicionar template_id aos contratos
-- =============================================

-- Adicionar coluna template_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contratos' 
    AND column_name = 'template_id'
  ) THEN
    ALTER TABLE contratos ADD COLUMN template_id UUID REFERENCES contract_templates(id);
    RAISE NOTICE 'Coluna template_id adicionada à tabela contratos';
  ELSE
    RAISE NOTICE 'Coluna template_id já existe na tabela contratos';
  END IF;
END $$;

-- Comentar a tabela
COMMENT ON COLUMN contratos.template_id IS 'Referência ao template usado para gerar este contrato';