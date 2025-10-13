-- Criar contrato faltante para UNIMED RECIFE (inscrição fb71e377-cc27-4884-b8df-5e6f1cbe7dbb)
INSERT INTO contratos (
  inscricao_id,
  numero_contrato,
  status,
  dados_contrato,
  tipo,
  created_at,
  updated_at
)
VALUES (
  'fb71e377-cc27-4884-b8df-5e6f1cbe7dbb',
  'CONT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'),
  'pendente_assinatura',
  jsonb_build_object(
    'tipo', 'credenciamento',
    'data_geracao', NOW(),
    'needs_regeneration', true
  ),
  'credenciamento',
  NOW(),
  NOW()
)
ON CONFLICT (inscricao_id) DO NOTHING;