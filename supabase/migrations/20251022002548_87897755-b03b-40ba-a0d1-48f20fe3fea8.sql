-- Migration: Migrar documentos (COM ON CONFLICT)
CREATE TEMP TABLE IF NOT EXISTS tipo_doc_validade (tipo TEXT PRIMARY KEY, meses INTEGER);

INSERT INTO tipo_doc_validade VALUES
  ('CNPJ', 0), ('Contrato Social', 0), ('Certificado MEI', 12),
  ('Alvará Sanitário', 12), ('Alvará de Funcionamento', 12),
  ('Certidão Negativa Municipal', 6), ('Certidão Negativa Federal', 6),
  ('RG', 0), ('CPF', 0), ('CRM', 0), ('Outros', 12);

DO $$
DECLARE
  v_cred RECORD;
  v_doc RECORD;
  v_venc DATE;
  v_num TEXT;
  v_meses INT;
  v_migrados INT := 0;
  v_pulados INT := 0;
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
      SELECT meses INTO v_meses FROM tipo_doc_validade WHERE tipo = v_doc.tipo_documento;
      v_meses := COALESCE(v_meses, 12);
      v_venc := CASE WHEN v_meses = 0 THEN NULL ELSE v_doc.created_at::DATE + (v_meses || ' months')::INTERVAL END;
      v_num := CASE WHEN v_doc.ocr_resultado IS NOT NULL THEN v_doc.ocr_resultado->>'numero' ELSE NULL END;
      
      BEGIN
        INSERT INTO documentos_credenciados (
          credenciado_id, tipo_documento, numero_documento,
          url_arquivo, arquivo_nome, criado_em, data_emissao,
          data_vencimento, status, origem, ocr_resultado, is_current
        ) VALUES (
          v_cred.id, v_doc.tipo_documento, v_num,
          v_doc.arquivo_url, v_doc.arquivo_nome,
          v_doc.created_at, v_doc.created_at::DATE,
          v_venc,
          CASE v_doc.status WHEN 'validado' THEN 'aprovado' WHEN 'aprovado' THEN 'aprovado' ELSE 'pendente' END,
          'migracao_correcao_definitiva',
          v_doc.ocr_resultado, true
        )
        ON CONFLICT (credenciado_id, tipo_documento) DO NOTHING;
        
        IF FOUND THEN
          v_migrados := v_migrados + 1;
        ELSE
          v_pulados := v_pulados + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_pulados := v_pulados + 1;
        RAISE NOTICE 'Erro ao migrar documento: %', SQLERRM;
      END;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '✅ Migrados: %, Pulados: %', v_migrados, v_pulados;
END $$;