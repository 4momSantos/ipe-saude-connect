-- Migração com TODOS OS TRIGGERS desabilitados
-- Usando SESSION_REPLICATION_ROLE para bypass de triggers

-- 1. Desabilitar triggers (apenas nesta transação)
SET LOCAL session_replication_role = replica;

-- 2. Desativar documentos antigos
UPDATE documentos_credenciados
SET is_current = false
WHERE credenciado_id IN (
  'e9376c40-3082-424a-aaa2-75b8dd5919e7',
  '78c50ab4-b8a8-499a-ab27-b9269838a78a',
  '746104d2-395c-43ce-94ce-b162c1ca9ba5'
);

-- 3. Migrar TODOS os 125 documentos (sem disparar triggers)
INSERT INTO documentos_credenciados (
  credenciado_id,
  tipo_documento,
  descricao,
  url_arquivo,
  arquivo_nome,
  arquivo_tamanho,
  storage_path,
  data_emissao,
  status,
  is_current,
  origem,
  inscricao_id,
  documento_origem_id,
  ocr_processado,
  ocr_resultado,
  ocr_confidence,
  metadata,
  criado_em
)
SELECT 
  c.id,
  di.tipo_documento,
  'Documento migrado da inscrição',
  di.arquivo_url,
  di.arquivo_nome,
  di.arquivo_tamanho,
  di.arquivo_url,
  di.created_at::date,
  CASE 
    WHEN di.status = 'validado' THEN 'aprovado'
    WHEN di.status IS NULL THEN 'ativo'
    ELSE di.status
  END,
  true,
  'migracao_sql_direta_20251020',
  di.inscricao_id,
  di.id,
  COALESCE(di.ocr_processado, false),
  di.ocr_resultado,
  di.ocr_confidence,
  jsonb_build_object(
    'migrado_em', NOW(),
    'status_original', di.status
  ),
  di.created_at
FROM inscricao_documentos di
INNER JOIN credenciados c ON c.inscricao_id = di.inscricao_id
WHERE c.id IN (
  'e9376c40-3082-424a-aaa2-75b8dd5919e7',
  '78c50ab4-b8a8-499a-ab27-b9269838a78a',
  '746104d2-395c-43ce-94ce-b162c1ca9ba5'
)
AND di.arquivo_url IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Restaurar triggers (automático ao fim da transação)
SET LOCAL session_replication_role = DEFAULT;