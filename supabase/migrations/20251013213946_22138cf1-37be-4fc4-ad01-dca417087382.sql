-- Remover constraint antiga e criar nova com status "Aguardando Assinatura"
ALTER TABLE credenciados DROP CONSTRAINT IF EXISTS credenciados_status_check;

ALTER TABLE credenciados ADD CONSTRAINT credenciados_status_check 
CHECK (status IN (
  'Ativo',
  'Suspenso',
  'Inativo',
  'Descredenciado',
  'Aguardando Assinatura'
));

-- Fase 1: Corrigir status dos credenciados existentes sem assinatura
UPDATE credenciados
SET 
  status = 'Aguardando Assinatura',
  observacoes = COALESCE(observacoes, '') || 
    E'\n[' || NOW()::TEXT || '] Status corrigido: aguardando assinatura de contrato',
  updated_at = NOW()
WHERE id IN (
  'b061cd3e-7752-4755-8dc9-b97bdfc901d9',
  'e291bb45-6399-4de6-be29-7997ddb71db8'
);

-- Fase 2: Desabilitar trigger que cria credenciados ativos prematuramente
DROP TRIGGER IF EXISTS trigger_sync_approved_to_credenciado ON inscricoes_edital;

-- Fase 3: Criar contratos faltantes para inscrições aprovadas
INSERT INTO contratos (
  inscricao_id,
  numero_contrato,
  status,
  dados_contrato,
  created_at
)
SELECT 
  ie.id,
  'CONT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
  'pendente_assinatura',
  jsonb_build_object(
    'tipo', 'credenciamento',
    'data_geracao', NOW()
  ),
  NOW()
FROM inscricoes_edital ie
LEFT JOIN contratos c ON c.inscricao_id = ie.id
WHERE ie.status = 'aprovado'
  AND c.id IS NULL
ON CONFLICT (inscricao_id) DO NOTHING;