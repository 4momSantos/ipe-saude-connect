-- ============================================
-- REQ-20: SISTEMA DE CERTIFICADO DE REGULARIDADE CADASTRAL
-- FASE 1: MVP FUNCIONAL
-- ============================================

-- 1. CRIAR ENUM PARA STATUS DE REGULARIDADE (4 níveis - sem suspensão)
CREATE TYPE status_regularidade_enum AS ENUM (
    'regular', 
    'regular_ressalvas', 
    'irregular', 
    'inativo'
);

-- 2. FUNÇÃO AUXILIAR: Verificar se tabela existe
CREATE OR REPLACE FUNCTION tabela_existe(p_schema TEXT, p_tabela TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = p_schema AND table_name = p_tabela
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. VIEW: Consolidar dados de regularidade (sem calcular status)
CREATE OR REPLACE VIEW v_dados_regularidade AS
SELECT 
    c.id AS credenciado_id,
    c.nome,
    c.cpf AS cpf_cnpj,
    CASE 
        WHEN c.cpf IS NOT NULL THEN 'fisica'
        WHEN c.cnpj IS NOT NULL THEN 'juridica'
        ELSE 'fisica'
    END AS tipo_pessoa,
    c.status AS status_cadastro,
    c.updated_at AS data_ultima_atualizacao,
    
    -- Documentos (consolidados via inscricao_documentos)
    (SELECT jsonb_agg(jsonb_build_object(
        'tipo', d.tipo_documento,
        'status', d.status,
        'analisado_em', d.analisado_em
    ))
    FROM inscricao_documentos d
    JOIN inscricoes_edital ie ON ie.id = d.inscricao_id
    WHERE ie.id = c.inscricao_id
    ) AS documentos,
    
    -- Contratos
    (SELECT jsonb_agg(jsonb_build_object(
        'id', co.id,
        'status', co.status,
        'gerado_em', co.gerado_em,
        'assinado_em', co.assinado_em
    ))
    FROM contratos co
    WHERE co.inscricao_id = c.inscricao_id
    ) AS contratos

FROM credenciados c;

-- 4. FUNÇÃO: Calcular status de regularidade
CREATE OR REPLACE FUNCTION calcular_status_regularidade(p_credenciado_id UUID)
RETURNS TABLE (
    status status_regularidade_enum,
    pendencias jsonb,
    detalhes jsonb
) AS $$
DECLARE
    v_dados RECORD;
    v_status status_regularidade_enum;
    v_pendencias jsonb := '[]'::jsonb;
    v_detalhes jsonb;
    
    v_docs_total INT := 0;
    v_docs_aprovados INT := 0;
    v_contratos_ativos INT := 0;
    v_cadastro_desatualizado BOOLEAN := FALSE;
BEGIN
    -- Buscar dados consolidados
    SELECT * INTO v_dados
    FROM v_dados_regularidade
    WHERE credenciado_id = p_credenciado_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credenciado não encontrado';
    END IF;
    
    -- ANÁLISE 1: Status do Cadastro
    IF v_dados.status_cadastro IN ('Inativo', 'Cancelado', 'Bloqueado') THEN
        v_status := 'inativo';
        v_pendencias := v_pendencias || jsonb_build_object(
            'tipo', 'cadastro',
            'descricao', 'Cadastro está ' || v_dados.status_cadastro,
            'severidade', 'critica'
        );
        
        v_detalhes := jsonb_build_object('status_cadastro', v_dados.status_cadastro);
        RETURN QUERY SELECT v_status, v_pendencias, v_detalhes;
        RETURN;
    END IF;
    
    -- ANÁLISE 2: Documentos
    IF v_dados.documentos IS NOT NULL THEN
        SELECT 
            COUNT(*),
            COUNT(*) FILTER (WHERE (doc->>'status')::text = 'aprovado')
        INTO v_docs_total, v_docs_aprovados
        FROM jsonb_array_elements(v_dados.documentos) AS doc;
        
        IF v_docs_aprovados < v_docs_total THEN
            v_pendencias := v_pendencias || jsonb_build_object(
                'tipo', 'documentos',
                'descricao', format('Documentos pendentes: %s de %s aprovados', v_docs_aprovados, v_docs_total),
                'severidade', 'critica'
            );
        END IF;
    END IF;
    
    -- ANÁLISE 3: Contratos
    IF v_dados.contratos IS NOT NULL THEN
        SELECT COUNT(*) FILTER (WHERE (co->>'status')::text = 'assinado')
        INTO v_contratos_ativos
        FROM jsonb_array_elements(v_dados.contratos) AS co;
        
        IF v_contratos_ativos = 0 THEN
            v_pendencias := v_pendencias || jsonb_build_object(
                'tipo', 'contrato',
                'descricao', 'Nenhum contrato assinado',
                'severidade', 'critica'
            );
        END IF;
    ELSE
        v_pendencias := v_pendencias || jsonb_build_object(
            'tipo', 'contrato',
            'descricao', 'Nenhum contrato encontrado',
            'severidade', 'critica'
        );
    END IF;
    
    -- ANÁLISE 4: Atualização Cadastral
    v_cadastro_desatualizado := (v_dados.data_ultima_atualizacao < CURRENT_DATE - INTERVAL '12 months');
    
    IF v_cadastro_desatualizado THEN
        v_pendencias := v_pendencias || jsonb_build_object(
            'tipo', 'atualizacao',
            'descricao', 'Cadastro desatualizado (>12 meses)',
            'severidade', 'media'
        );
    END IF;
    
    -- DETERMINAR STATUS FINAL
    IF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_pendencias) AS p
        WHERE p->>'severidade' = 'critica'
    ) THEN
        v_status := 'irregular';
    ELSIF EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_pendencias) AS p
        WHERE p->>'severidade' = 'media'
    ) THEN
        v_status := 'regular_ressalvas';
    ELSE
        v_status := 'regular';
    END IF;
    
    -- Montar detalhes
    v_detalhes := jsonb_build_object(
        'docs_total', v_docs_total,
        'docs_aprovados', v_docs_aprovados,
        'contratos_ativos', v_contratos_ativos,
        'cadastro_desatualizado', v_cadastro_desatualizado
    );
    
    RETURN QUERY SELECT v_status, v_pendencias, v_detalhes;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. TABELA: Certificados de Regularidade
CREATE TABLE IF NOT EXISTS certificados_regularidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credenciado_id UUID NOT NULL REFERENCES credenciados(id) ON DELETE CASCADE,
    
    -- Identificação
    numero_certificado TEXT UNIQUE NOT NULL,
    codigo_verificacao CHAR(8) UNIQUE NOT NULL,
    hash_verificacao TEXT NOT NULL,
    
    -- Status e Dados
    status status_regularidade_enum NOT NULL,
    pendencias JSONB NOT NULL DEFAULT '[]'::jsonb,
    detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
    dados_snapshot JSONB NOT NULL,
    
    -- Vigência
    emitido_em TIMESTAMP NOT NULL DEFAULT NOW(),
    emitido_por UUID,
    valido_de DATE NOT NULL,
    valido_ate DATE NOT NULL,
    
    -- Arquivos
    url_pdf TEXT,
    metadata_pdf JSONB,
    
    -- Controle
    ativo BOOLEAN DEFAULT TRUE,
    cancelado BOOLEAN DEFAULT FALSE,
    cancelado_em TIMESTAMP,
    cancelado_por UUID,
    motivo_cancelamento TEXT,
    substituido_por UUID REFERENCES certificados_regularidade(id),
    
    -- Consultas Públicas
    total_consultas INT DEFAULT 0,
    ultima_consulta TIMESTAMP,
    
    -- Auditoria
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT validade_coerente CHECK (valido_ate > valido_de),
    CONSTRAINT cancelamento_completo CHECK (
        (cancelado = FALSE) OR 
        (cancelado = TRUE AND cancelado_em IS NOT NULL AND cancelado_por IS NOT NULL)
    )
);

-- 6. TABELA: Log de Consultas Públicas
CREATE TABLE IF NOT EXISTS certificados_consultas_publicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificado_id UUID REFERENCES certificados_regularidade(id) ON DELETE SET NULL,
    
    tipo_consulta TEXT NOT NULL CHECK (tipo_consulta IN ('codigo', 'numero', 'qrcode')),
    parametro_busca TEXT,
    resultado TEXT NOT NULL CHECK (resultado IN ('encontrado', 'nao_encontrado', 'expirado', 'cancelado', 'invalido')),
    
    ip_origem INET,
    user_agent TEXT,
    
    consultado_em TIMESTAMP DEFAULT NOW()
);

-- 7. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_cert_reg_credenciado ON certificados_regularidade(credenciado_id, ativo) WHERE NOT cancelado;
CREATE INDEX IF NOT EXISTS idx_cert_reg_numero ON certificados_regularidade(numero_certificado);
CREATE INDEX IF NOT EXISTS idx_cert_reg_codigo ON certificados_regularidade(codigo_verificacao);
CREATE INDEX IF NOT EXISTS idx_cert_reg_validade ON certificados_regularidade(valido_ate, ativo) WHERE NOT cancelado;
CREATE INDEX IF NOT EXISTS idx_cert_reg_status ON certificados_regularidade(status, ativo);
CREATE INDEX IF NOT EXISTS idx_cert_reg_pendencias ON certificados_regularidade USING gin(pendencias);
CREATE INDEX IF NOT EXISTS idx_cert_consultas_cert ON certificados_consultas_publicas(certificado_id, consultado_em DESC);
CREATE INDEX IF NOT EXISTS idx_cert_consultas_data ON certificados_consultas_publicas(consultado_em);
CREATE INDEX IF NOT EXISTS idx_cert_consultas_ip ON certificados_consultas_publicas(ip_origem, consultado_em);

-- 8. SEQUÊNCIA para números de certificado
CREATE SEQUENCE IF NOT EXISTS seq_certificados_regularidade;

-- 9. FUNÇÕES AUXILIARES

-- Gerar número de certificado
CREATE OR REPLACE FUNCTION gerar_numero_certificado()
RETURNS TEXT AS $$
DECLARE
    v_ano TEXT;
    v_seq TEXT;
BEGIN
    v_ano := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_seq := LPAD(nextval('seq_certificados_regularidade')::TEXT, 6, '0');
    RETURN 'CRC-' || v_ano || '-' || v_seq;
END;
$$ LANGUAGE plpgsql;

-- Gerar código de verificação
CREATE OR REPLACE FUNCTION gerar_codigo_verificacao()
RETURNS CHAR(8) AS $$
DECLARE
    v_codigo CHAR(8);
    v_tentativas INT := 0;
BEGIN
    LOOP
        v_codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
        
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM certificados_regularidade WHERE codigo_verificacao = v_codigo
        );
        
        v_tentativas := v_tentativas + 1;
        IF v_tentativas > 100 THEN
            RAISE EXCEPTION 'Falha ao gerar código único após 100 tentativas';
        END IF;
    END LOOP;
    
    RETURN v_codigo;
END;
$$ LANGUAGE plpgsql;

-- Gerar hash de verificação
CREATE OR REPLACE FUNCTION gerar_hash_certificado(
    p_credenciado_id UUID,
    p_numero TEXT,
    p_status TEXT,
    p_timestamp TIMESTAMP
)
RETURNS TEXT AS $$
BEGIN
    RETURN ENCODE(
        DIGEST(
            p_credenciado_id::TEXT || '|' ||
            p_numero || '|' ||
            p_status || '|' ||
            p_timestamp::TEXT,
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. TRIGGERS

-- Invalidar certificados anteriores
CREATE OR REPLACE FUNCTION trg_invalidar_certificados_anteriores()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE certificados_regularidade
    SET 
        ativo = FALSE,
        updated_at = NOW()
    WHERE 
        credenciado_id = NEW.credenciado_id
        AND id != NEW.id
        AND ativo = TRUE
        AND NOT cancelado;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cert_reg_invalidar_anteriores
    AFTER INSERT ON certificados_regularidade
    FOR EACH ROW
    EXECUTE FUNCTION trg_invalidar_certificados_anteriores();

-- Atualizar contador de consultas
CREATE OR REPLACE FUNCTION trg_atualizar_consultas()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.resultado = 'encontrado' AND NEW.certificado_id IS NOT NULL THEN
        UPDATE certificados_regularidade
        SET 
            total_consultas = total_consultas + 1,
            ultima_consulta = NEW.consultado_em,
            updated_at = NOW()
        WHERE id = NEW.certificado_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cert_consultas_atualizar
    AFTER INSERT ON certificados_consultas_publicas
    FOR EACH ROW
    EXECUTE FUNCTION trg_atualizar_consultas();

-- Atualizar timestamp
CREATE OR REPLACE FUNCTION trg_cert_reg_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cert_reg_updated_at
    BEFORE UPDATE ON certificados_regularidade
    FOR EACH ROW
    EXECUTE FUNCTION trg_cert_reg_updated_at();

-- 11. RLS POLICIES
ALTER TABLE certificados_regularidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificados_consultas_publicas ENABLE ROW LEVEL SECURITY;

-- Credenciados veem apenas seus certificados
CREATE POLICY pol_cert_reg_credenciado ON certificados_regularidade
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM credenciados c
            JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
            WHERE c.id = certificados_regularidade.credenciado_id
            AND ie.candidato_id = auth.uid()
        )
        OR
        has_role(auth.uid(), 'admin'::app_role)
        OR
        has_role(auth.uid(), 'gestor'::app_role)
    );

-- Sistema pode inserir certificados
CREATE POLICY pol_cert_reg_insert ON certificados_regularidade
    FOR INSERT
    WITH CHECK (true);

-- Log de consultas: apenas admins
CREATE POLICY pol_consultas_admin ON certificados_consultas_publicas
    FOR SELECT
    USING (has_role(auth.uid(), 'admin'::app_role));

-- Sistema pode inserir consultas públicas
CREATE POLICY pol_consultas_insert ON certificados_consultas_publicas
    FOR INSERT
    WITH CHECK (true);

-- 12. FUNÇÃO PARA CONSULTA PÚBLICA (sem autenticação)
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