-- Corrigir ambiguidade de colunas na função consultar_certificado_publico
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
    -- Buscar certificado (usando alias 'cr' para evitar ambiguidade)
    IF p_tipo = 'codigo' THEN
        SELECT cr.* INTO v_cert
        FROM certificados_regularidade cr
        WHERE cr.codigo_verificacao = UPPER(p_valor);
    ELSIF p_tipo = 'numero' THEN
        SELECT cr.* INTO v_cert
        FROM certificados_regularidade cr
        WHERE cr.numero_certificado = UPPER(p_valor);
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
    
    -- Buscar credenciado (usando alias 'c')
    SELECT c.nome, 
           CASE WHEN c.cpf IS NOT NULL THEN 'fisica' ELSE 'juridica' END
    INTO v_nome, v_tipo
    FROM credenciados c
    WHERE c.id = v_cert.credenciado_id;
    
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

-- Garantir permissão de execução pública
GRANT EXECUTE ON FUNCTION consultar_certificado_publico(TEXT, TEXT) TO anon, authenticated;