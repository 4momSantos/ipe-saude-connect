-- Atualizar consultar_certificado_publico para incluir dados completos do credenciado
DROP FUNCTION IF EXISTS public.consultar_certificado_publico(text, text);

CREATE OR REPLACE FUNCTION public.consultar_certificado_publico(p_tipo text, p_valor text)
RETURNS TABLE(
    encontrado boolean,
    status text,
    numero_certificado text,
    emitido_em date,
    valido_ate date,
    situacao text,
    credenciado jsonb,
    hash_verificacao text,
    certificado_id uuid,
    tem_pdf boolean,
    url_pdf text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_cert RECORD;
    v_situacao TEXT;
    v_nome TEXT;
    v_tipo TEXT;
    v_cpf TEXT;
    v_cnpj TEXT;
    v_status TEXT;
    v_especialidades JSONB;
BEGIN
    -- Buscar certificado
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
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::DATE, 
            NULL::TEXT, NULL::JSONB, NULL::TEXT, NULL::UUID, FALSE, NULL::TEXT;
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
    
    -- Buscar dados completos do credenciado com especialidades
    SELECT 
      c.nome, 
      CASE WHEN c.cpf IS NOT NULL THEN 'fisica' ELSE 'juridica' END,
      c.cpf,
      c.cnpj,
      c.status,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'crm', crm.crm,
              'uf_crm', crm.uf_crm,
              'especialidade', crm.especialidade
            )
          )
          FROM credenciado_crms crm
          WHERE crm.credenciado_id = c.id
        ), 
        '[]'::jsonb
      )
    INTO v_nome, v_tipo, v_cpf, v_cnpj, v_status, v_especialidades
    FROM credenciados c
    WHERE c.id = v_cert.credenciado_id;
    
    -- Atualizar contadores de consulta
    UPDATE certificados_regularidade
    SET 
        ultima_consulta = NOW(),
        total_consultas = total_consultas + 1
    WHERE id = v_cert.id;
    
    -- Retornar com dados completos
    RETURN QUERY SELECT 
        TRUE,
        v_cert.status::TEXT,
        v_cert.numero_certificado,
        v_cert.emitido_em::DATE,
        v_cert.valido_ate,
        v_situacao,
        jsonb_build_object(
          'nome', v_nome, 
          'tipo', v_tipo,
          'cpf', v_cpf,
          'cnpj', v_cnpj,
          'status', v_status,
          'especialidades', v_especialidades
        ),
        v_cert.hash_verificacao,
        v_cert.id,
        (v_cert.url_pdf IS NOT NULL),
        v_cert.url_pdf;
END;
$$;

-- Atualizar consultar_certificado_por_credenciado com mesma estrutura
DROP FUNCTION IF EXISTS public.consultar_certificado_por_credenciado(uuid);

CREATE OR REPLACE FUNCTION public.consultar_certificado_por_credenciado(p_credenciado_id uuid)
RETURNS TABLE(
    encontrado boolean,
    status text,
    numero_certificado text,
    emitido_em date,
    valido_ate date,
    situacao text,
    credenciado jsonb,
    hash_verificacao text,
    certificado_id uuid,
    tem_pdf boolean,
    url_pdf text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_cert RECORD;
    v_situacao TEXT;
    v_nome TEXT;
    v_tipo TEXT;
    v_cpf TEXT;
    v_cnpj TEXT;
    v_status TEXT;
    v_especialidades JSONB;
BEGIN
    -- Buscar certificado mais recente do credenciado
    SELECT cr.* INTO v_cert
    FROM certificados_regularidade cr
    WHERE cr.credenciado_id = p_credenciado_id
      AND cr.ativo = true
    ORDER BY cr.emitido_em DESC
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            FALSE, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::DATE, 
            NULL::TEXT, NULL::JSONB, NULL::TEXT, NULL::UUID, FALSE, NULL::TEXT;
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
    
    -- Buscar dados completos do credenciado com especialidades
    SELECT 
      c.nome, 
      CASE WHEN c.cpf IS NOT NULL THEN 'fisica' ELSE 'juridica' END,
      c.cpf,
      c.cnpj,
      c.status,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'crm', crm.crm,
              'uf_crm', crm.uf_crm,
              'especialidade', crm.especialidade
            )
          )
          FROM credenciado_crms crm
          WHERE crm.credenciado_id = c.id
        ), 
        '[]'::jsonb
      )
    INTO v_nome, v_tipo, v_cpf, v_cnpj, v_status, v_especialidades
    FROM credenciados c
    WHERE c.id = p_credenciado_id;
    
    -- Retornar com dados completos
    RETURN QUERY SELECT 
        TRUE,
        v_cert.status::TEXT,
        v_cert.numero_certificado,
        v_cert.emitido_em::DATE,
        v_cert.valido_ate,
        v_situacao,
        jsonb_build_object(
          'nome', v_nome, 
          'tipo', v_tipo,
          'cpf', v_cpf,
          'cnpj', v_cnpj,
          'status', v_status,
          'especialidades', v_especialidades
        ),
        v_cert.hash_verificacao,
        v_cert.id,
        (v_cert.url_pdf IS NOT NULL),
        v_cert.url_pdf;
END;
$$;

-- Recriar grants
GRANT EXECUTE ON FUNCTION consultar_certificado_publico(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION consultar_certificado_por_credenciado(UUID) TO anon, authenticated;