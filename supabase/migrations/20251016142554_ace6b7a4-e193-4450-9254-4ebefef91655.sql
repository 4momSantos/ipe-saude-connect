-- MIGRAÇÃO RETROATIVA: Pegar apenas o documento mais recente de cada tipo por credenciado
WITH documentos_unicos AS (
  SELECT DISTINCT ON (c.id, id.tipo_documento)
    c.id AS credenciado_id,
    ie.id AS inscricao_id,
    id.id AS documento_origem_id,
    id.tipo_documento,
    'Documento migrado da inscrição ' || ie.protocolo AS descricao,
    COALESCE(
      id.ocr_resultado->>'numeroDocumento',
      ie.protocolo
    ) AS numero_documento,
    id.arquivo_url AS url_arquivo,
    id.arquivo_nome,
    id.arquivo_tamanho,
    NULL AS storage_path,
    id.created_at::DATE AS data_emissao,
    (id.created_at::DATE + 
      CASE id.tipo_documento
        WHEN 'CNPJ' THEN INTERVAL '24 months'
        WHEN 'Contrato Social' THEN INTERVAL '100 years'
        WHEN 'Alvará Sanitário' THEN INTERVAL '12 months'
        WHEN 'Certidão Negativa Federal' THEN INTERVAL '6 months'
        WHEN 'Certidão Negativa Estadual' THEN INTERVAL '6 months'
        WHEN 'Certidão Negativa Municipal' THEN INTERVAL '6 months'
        WHEN 'CNES' THEN INTERVAL '24 months'
        WHEN 'CRM' THEN INTERVAL '12 months'
        WHEN 'RG' THEN INTERVAL '100 years'
        WHEN 'CPF' THEN INTERVAL '100 years'
        ELSE INTERVAL '12 months'
      END
    )::DATE AS data_vencimento,
    'ativo' AS status,
    'migrado' AS origem,
    id.uploaded_by AS criado_por,
    id.created_at AS criado_em
  FROM inscricao_documentos id
  JOIN inscricoes_edital ie ON ie.id = id.inscricao_id
  JOIN credenciados c ON c.inscricao_id = ie.id
  WHERE 
    ie.status = 'aprovado'
    AND id.is_current = true
    AND NOT EXISTS (
      SELECT 1 FROM documentos_credenciados dc
      WHERE dc.documento_origem_id = id.id
    )
  ORDER BY c.id, id.tipo_documento, id.created_at DESC
)
INSERT INTO documentos_credenciados (
  credenciado_id,
  inscricao_id,
  documento_origem_id,
  tipo_documento,
  descricao,
  numero_documento,
  url_arquivo,
  arquivo_nome,
  arquivo_tamanho,
  storage_path,
  data_emissao,
  data_vencimento,
  status,
  origem,
  criado_por,
  criado_em
)
SELECT * FROM documentos_unicos
ON CONFLICT (credenciado_id, tipo_documento, is_current)
DO UPDATE SET
  url_arquivo = EXCLUDED.url_arquivo,
  arquivo_nome = EXCLUDED.arquivo_nome,
  data_vencimento = EXCLUDED.data_vencimento,
  origem = 'migrado',
  inscricao_id = EXCLUDED.inscricao_id,
  documento_origem_id = EXCLUDED.documento_origem_id,
  atualizado_em = NOW();