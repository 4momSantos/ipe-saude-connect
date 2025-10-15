-- FASE 2: DROP e recriar função consultar_certificado_publico com novos campos
DROP FUNCTION IF EXISTS consultar_certificado_publico(TEXT, TEXT);

CREATE OR REPLACE FUNCTION consultar_certificado_publico(
    p_tipo TEXT,
    p_valor TEXT
)
RETURNS TABLE (
    encontrado BOOLEAN,
    status TEXT,
    numero_certificado TEXT,
    emitido_em DATE,
    valido_ate DATE,
    situacao TEXT,
    credenciado JSONB,
    hash_verificacao TEXT,
    certificado_id UUID,
    tem_pdf BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cert RECORD;
    v_situacao TEXT;
    v_nome TEXT;
    v_tipo TEXT;
BEGIN
    -- Buscar certificado
    IF p_tipo = 'codigo' THEN
        SELECT * INTO v_cert
        FROM certificados_regularidade
        WHERE codigo_verificacao = UPPER(p_valor);
    ELSIF p_tipo = 'numero' THEN
        SELECT * INTO v_cert
        FROM certificados_regularidade
        WHERE numero_certificado = UPPER(p_valor);
    ELSE
        RAISE EXCEPTION 'Tipo de consulta inválido';
    END IF;
    
    -- Não encontrado
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::DATE, 
            NULL::TEXT, NULL::JSONB, NULL::TEXT, NULL::UUID, FALSE;
        RETURN;
    END IF;
    
    -- Determinar situação
    IF v_cert.cancelado THEN
        v_situacao := 'Cancelado';
    ELSIF NOT v_cert.ativo THEN
        v_situacao := 'Substituído';
    ELSIF v_cert.valido_ate < CURRENT_DATE THEN
        v_situacao := 'Expirado';
    ELSE
        v_situacao := 'Válido';
    END IF;
    
    -- Buscar credenciado
    SELECT nome, 
           CASE WHEN cpf IS NOT NULL THEN 'fisica' ELSE 'juridica' END
    INTO v_nome, v_tipo
    FROM credenciados
    WHERE id = v_cert.credenciado_id;
    
    -- Retornar dados públicos
    RETURN QUERY SELECT 
        TRUE,
        v_cert.status::TEXT,
        v_cert.numero_certificado,
        v_cert.emitido_em::DATE,
        v_cert.valido_ate,
        v_situacao,
        jsonb_build_object('nome', v_nome, 'tipo', v_tipo),
        v_cert.hash_verificacao,
        v_cert.id,
        (v_cert.url_pdf IS NOT NULL)
    ;
END;
$$;

-- FASE 3: Adicionar URLs de PDFs de teste
UPDATE certificados_regularidade
SET url_pdf = CASE 
  WHEN codigo_verificacao = 'A1B2C3D4' 
    THEN 'https://ncmofeencqpqhtguxmvy.supabase.co/storage/v1/object/public/certificados-regularidade/CRC-2025-000001.pdf'
  WHEN codigo_verificacao = 'X9Y8Z7W6'
    THEN 'https://ncmofeencqpqhtguxmvy.supabase.co/storage/v1/object/public/certificados-regularidade/CRC-2024-999999.pdf'
  WHEN codigo_verificacao = 'P1Q2R3S4'
    THEN 'https://ncmofeencqpqhtguxmvy.supabase.co/storage/v1/object/public/certificados-regularidade/CRC-2025-000002.pdf'
END
WHERE codigo_verificacao IN ('A1B2C3D4', 'X9Y8Z7W6', 'P1Q2R3S4');