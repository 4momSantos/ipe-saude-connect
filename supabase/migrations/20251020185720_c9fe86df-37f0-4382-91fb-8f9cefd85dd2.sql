-- Criar função SQL para migração direta de documentos
CREATE OR REPLACE FUNCTION migrar_documentos_sql_direto(p_credenciado_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_migrados integer := 0;
  v_credenciado_id uuid;
BEGIN
  -- Desativar documentos antigos dos credenciados especificados
  UPDATE documentos_credenciados
  SET is_current = false
  WHERE credenciado_id = ANY(p_credenciado_ids);

  -- Migrar documentos de inscricao_documentos para documentos_credenciados
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
    c.id as credenciado_id,
    di.tipo_documento,
    'Documento migrado da inscrição' as descricao,
    di.arquivo_url as url_arquivo,
    di.arquivo_nome,
    di.arquivo_tamanho,
    di.arquivo_url as storage_path,
    COALESCE(di.created_at::date, CURRENT_DATE) as data_emissao,
    COALESCE(di.status, 'ativo') as status,
    true as is_current,
    'migracao_sql_direta_20251020' as origem,
    di.inscricao_id,
    di.id as documento_origem_id,
    COALESCE(di.ocr_processado, false) as ocr_processado,
    di.ocr_resultado,
    di.ocr_confidence,
    jsonb_build_object(
      'migrado_em', NOW(),
      'status_original', di.status,
      'versao_original', di.versao
    ) as metadata,
    di.created_at as criado_em
  FROM inscricao_documentos di
  INNER JOIN credenciados c ON c.inscricao_id = di.inscricao_id
  WHERE c.id = ANY(p_credenciado_ids)
    AND di.arquivo_url IS NOT NULL
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_total_migrados = ROW_COUNT;

  RETURN jsonb_build_object(
    'total_migrados', v_total_migrados,
    'credenciados_processados', array_length(p_credenciado_ids, 1),
    'success', true
  );
END;
$$;