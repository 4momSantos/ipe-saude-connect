-- Seed: Certificados de Teste para Consulta Pública

-- Inserir credenciado de teste (se não existir)
INSERT INTO public.credenciados (
  id,
  nome,
  cpf,
  status,
  email,
  cidade,
  estado
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Clínica Exemplo de Teste Ltda',
  '12345678901',
  'Ativo',
  'teste@exemplo.com',
  'Porto Alegre',
  'RS'
)
ON CONFLICT (id) DO NOTHING;

-- Inserir certificado VÁLIDO para teste
INSERT INTO public.certificados_regularidade (
  id,
  credenciado_id,
  numero_certificado,
  codigo_verificacao,
  hash_verificacao,
  status,
  pendencias,
  detalhes,
  dados_snapshot,
  emitido_em,
  valido_de,
  valido_ate,
  ativo,
  cancelado
)
VALUES (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'CRC-2025-000001',
  'A1B2C3D4',
  'hash_valido_123',
  'regular',
  '[]'::jsonb,
  '{"docs_ok": 5, "docs_total": 5}'::jsonb,
  '{"credenciado": {"nome": "Clínica Exemplo de Teste Ltda"}}'::jsonb,
  NOW(),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '90 days',
  TRUE,
  FALSE
)
ON CONFLICT (numero_certificado) DO NOTHING;

-- Inserir certificado EXPIRADO para teste
INSERT INTO public.certificados_regularidade (
  id,
  credenciado_id,
  numero_certificado,
  codigo_verificacao,
  hash_verificacao,
  status,
  pendencias,
  detalhes,
  dados_snapshot,
  emitido_em,
  valido_de,
  valido_ate,
  ativo,
  cancelado
)
VALUES (
  '00000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000001',
  'CRC-2024-999999',
  'X9Y8Z7W6',
  'hash_expirado_456',
  'regular',
  '[]'::jsonb,
  '{"docs_ok": 5, "docs_total": 5}'::jsonb,
  '{"credenciado": {"nome": "Clínica Exemplo de Teste Ltda"}}'::jsonb,
  NOW() - INTERVAL '120 days',
  CURRENT_DATE - INTERVAL '120 days',
  CURRENT_DATE - INTERVAL '30 days',
  FALSE,
  FALSE
)
ON CONFLICT (numero_certificado) DO NOTHING;

-- Inserir certificado IRREGULAR para teste
INSERT INTO public.certificados_regularidade (
  id,
  credenciado_id,
  numero_certificado,
  codigo_verificacao,
  hash_verificacao,
  status,
  pendencias,
  detalhes,
  dados_snapshot,
  emitido_em,
  valido_de,
  valido_ate,
  ativo,
  cancelado
)
VALUES (
  '00000000-0000-0000-0000-000000000103',
  '00000000-0000-0000-0000-000000000001',
  'CRC-2025-000002',
  'P1Q2R3S4',
  'hash_irregular_789',
  'irregular',
  '[{"tipo": "documentos", "descricao": "2 documentos vencidos", "severidade": "critica"}]'::jsonb,
  '{"docs_ok": 3, "docs_total": 5}'::jsonb,
  '{"credenciado": {"nome": "Clínica Exemplo de Teste Ltda"}}'::jsonb,
  NOW(),
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '30 days',
  TRUE,
  FALSE
)
ON CONFLICT (numero_certificado) DO NOTHING;