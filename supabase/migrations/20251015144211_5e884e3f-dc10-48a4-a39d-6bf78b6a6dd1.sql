-- FASE 1 (Corrigida): Criar certificados para credenciados reais

-- Dropar e recriar funções auxiliares
DROP FUNCTION IF EXISTS gerar_numero_certificado();
DROP FUNCTION IF EXISTS gerar_codigo_verificacao();
DROP FUNCTION IF EXISTS gerar_hash_certificado(TEXT);

CREATE FUNCTION gerar_numero_certificado()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_ano TEXT;
  v_seq INTEGER;
BEGIN
  v_ano := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_certificado FROM 10 FOR 6) AS INTEGER)), 0) + 1
  INTO v_seq
  FROM certificados_regularidade
  WHERE numero_certificado LIKE 'CRC-' || v_ano || '-%';
  
  RETURN 'CRC-' || v_ano || '-' || LPAD(v_seq::TEXT, 6, '0');
END;
$$;

CREATE FUNCTION gerar_codigo_verificacao()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 8));
END;
$$;

CREATE FUNCTION gerar_hash_certificado(p_data TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN ENCODE(DIGEST(p_data, 'sha256'), 'hex');
END;
$$;

-- Inserir certificados para os 4 credenciados reais
DO $$
DECLARE
  v_credenciado RECORD;
  v_numero TEXT;
  v_codigo TEXT;
  v_hash TEXT;
BEGIN
  FOR v_credenciado IN 
    SELECT DISTINCT ON (cpf, cnpj) 
      id, nome, cpf, cnpj, created_at
    FROM credenciados
    WHERE (cpf IN ('12897708409', '99924813669') OR cnpj = '11214624000128')
      AND status = 'Ativo'
    ORDER BY cpf, cnpj, created_at DESC
  LOOP
    v_numero := gerar_numero_certificado();
    v_codigo := gerar_codigo_verificacao();
    v_hash := gerar_hash_certificado(v_credenciado.id::TEXT || NOW()::TEXT);
    
    INSERT INTO certificados_regularidade (
      credenciado_id,
      numero_certificado,
      codigo_verificacao,
      hash_verificacao,
      status,
      pendencias,
      detalhes,
      dados_snapshot,
      emitido_por,
      valido_de,
      valido_ate,
      ativo,
      cancelado,
      url_pdf
    )
    VALUES (
      v_credenciado.id,
      v_numero,
      v_codigo,
      v_hash,
      'regular',
      '[]'::jsonb,
      '{}'::jsonb,
      jsonb_build_object(
        'credenciado_nome', v_credenciado.nome,
        'credenciado_cpf', v_credenciado.cpf,
        'credenciado_cnpj', v_credenciado.cnpj,
        'emissao_timestamp', NOW()
      ),
      NULL,
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '90 days',
      true,
      false,
      NULL
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Certificado % criado para credenciado %', v_numero, v_credenciado.nome;
  END LOOP;
END $$;