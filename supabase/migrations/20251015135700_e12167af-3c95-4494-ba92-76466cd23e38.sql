-- Corrigir função consultar_certificado_publico (remover DECLARE aninhado)
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
    credenciado_nome TEXT,
    credenciado_tipo TEXT,
    hash_verificacao TEXT
) AS $$
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
            NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Determinar situação atual
    IF v_cert.cancelado THEN
        v_situacao := 'Cancelado';
    ELSIF NOT v_cert.ativo THEN
        v_situacao := 'Substituído';
    ELSIF v_cert.valido_ate < CURRENT_DATE THEN
        v_situacao := 'Expirado';
    ELSE
        v_situacao := 'Válido';
    END IF;
    
    -- Buscar nome do credenciado
    SELECT nome, 
           CASE WHEN cpf IS NOT NULL THEN 'fisica' ELSE 'juridica' END
    INTO v_nome, v_tipo
    FROM credenciados
    WHERE id = v_cert.credenciado_id;
    
    -- Retornar dados públicos (sem CPF/CNPJ)
    RETURN QUERY SELECT 
        TRUE,
        v_cert.status::TEXT,
        v_cert.numero_certificado,
        v_cert.emitido_em::DATE,
        v_cert.valido_ate,
        v_situacao,
        v_nome,
        v_tipo,
        v_cert.hash_verificacao;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder execução pública
GRANT EXECUTE ON FUNCTION consultar_certificado_publico TO anon;