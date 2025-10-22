-- Remover constraint único que impede múltiplos documentos do mesmo tipo
DROP INDEX IF EXISTS docs_cred_tipo_unico_idx;

-- Migrar documentos SEM o constraint
DO $$
DECLARE
  v_cred RECORD;
  v_doc RECORD;
  v_venc DATE;
  v_num TEXT;
  v_migrados INT := 0;
BEGIN
  FOR v_cred IN 
    SELECT id, inscricao_id, nome FROM credenciados
    WHERE inscricao_id IS NOT NULL AND status = 'Ativo'
  LOOP
    FOR v_doc IN
      SELECT id, tipo_documento, arquivo_url, arquivo_nome, status, created_at, ocr_resultado
      FROM inscricao_documentos
      WHERE inscricao_id = v_cred.inscricao_id
        AND status IN ('validado', 'aprovado', 'pendente')
        AND is_current = true
    LOOP
      -- Verificar se JÁ FOI migrado este documento ESPECÍFICO
      IF EXISTS (
        SELECT 1 FROM documentos_credenciados
        WHERE credenciado_id = v_cred.id
          AND documento_origem_id = v_doc.id
      ) THEN
        CONTINUE;
      END IF;
      
      v_venc := v_doc.created_at::DATE + INTERVAL '12 months';
      v_num := CASE WHEN v_doc.ocr_resultado IS NOT NULL THEN v_doc.ocr_resultado->>'numero' ELSE NULL END;
      
      INSERT INTO documentos_credenciados (
        credenciado_id, tipo_documento, numero_documento,
        url_arquivo, arquivo_nome, criado_em, data_emissao,
        data_vencimento, status, origem, ocr_resultado, 
        is_current, documento_origem_id
      ) VALUES (
        v_cred.id, v_doc.tipo_documento, v_num,
        v_doc.arquivo_url, v_doc.arquivo_nome,
        v_doc.created_at, v_doc.created_at::DATE,
        v_venc,
        CASE v_doc.status WHEN 'validado' THEN 'aprovado' WHEN 'aprovado' THEN 'aprovado' ELSE 'pendente' END,
        'migracao_correcao_definitiva',
        v_doc.ocr_resultado, true, v_doc.id
      );
      
      v_migrados := v_migrados + 1;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Migrados: %', v_migrados;
END $$;