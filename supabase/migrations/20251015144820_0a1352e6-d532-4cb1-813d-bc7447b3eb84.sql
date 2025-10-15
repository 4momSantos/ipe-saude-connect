-- Corrigir função consultar_certificado_por_credenciado com cast explícito
CREATE OR REPLACE FUNCTION consultar_certificado_por_credenciado(p_identificador TEXT)
RETURNS TABLE (
    encontrado BOOLEAN,
    status TEXT,
    numero_certificado TEXT,
    codigo_verificacao TEXT,
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
    v_credenciado_id UUID;
    v_nome TEXT;
    v_tipo TEXT;
BEGIN
    -- Tentar encontrar credenciado por UUID, CPF ou CNPJ
    SELECT id INTO v_credenciado_id
    FROM credenciados
    WHERE id::TEXT = p_identificador
       OR cpf = p_identificador
       OR cnpj = p_identificador
    LIMIT 1;
    
    IF v_credenciado_id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::DATE, 
            NULL::TEXT, NULL::JSONB, NULL::TEXT, NULL::UUID, FALSE;
        RETURN;
    END IF;
    
    -- Buscar certificado mais recente ativo
    SELECT * INTO v_cert
    FROM certificados_regularidade
    WHERE credenciado_id = v_credenciado_id
      AND ativo = true
      AND cancelado = false
    ORDER BY emitido_em DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::DATE, 
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
    
    -- Retornar dados COM CAST EXPLÍCITO
    RETURN QUERY SELECT 
        TRUE,
        v_cert.status::TEXT,
        v_cert.numero_certificado,
        v_cert.codigo_verificacao::TEXT,
        v_cert.emitido_em::DATE,
        v_cert.valido_ate,
        v_situacao,
        jsonb_build_object('nome', v_nome, 'tipo', v_tipo, 'id', v_cert.credenciado_id),
        v_cert.hash_verificacao,
        v_cert.id,
        (v_cert.url_pdf IS NOT NULL)
    ;
END;
$$;