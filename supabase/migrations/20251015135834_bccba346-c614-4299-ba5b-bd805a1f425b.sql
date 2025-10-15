-- Criar função trg_updated_at primeiro e depois recriar tabela

-- 1. Criar função de atualização de timestamp (se não existir)
CREATE OR REPLACE FUNCTION trg_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recriar tabela certificados_regularidade com referências corretas
DROP TABLE IF EXISTS certificados_regularidade CASCADE;

CREATE TABLE certificados_regularidade (
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
    
    -- Snapshot completo (para auditoria)
    dados_snapshot JSONB NOT NULL,
    
    -- Vigência
    emitido_em TIMESTAMP NOT NULL DEFAULT NOW(),
    emitido_por UUID REFERENCES profiles(id),
    valido_de DATE NOT NULL,
    valido_ate DATE NOT NULL,
    
    -- Arquivos
    url_pdf TEXT,
    metadata_pdf JSONB,
    
    -- Controle de Ciclo de Vida
    ativo BOOLEAN DEFAULT TRUE,
    cancelado BOOLEAN DEFAULT FALSE,
    cancelado_em TIMESTAMP,
    cancelado_por UUID REFERENCES profiles(id),
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

-- 3. Criar índices
CREATE INDEX idx_cert_reg_credenciado ON certificados_regularidade(credenciado_id, ativo) WHERE NOT cancelado;
CREATE INDEX idx_cert_reg_numero ON certificados_regularidade(numero_certificado);
CREATE INDEX idx_cert_reg_codigo ON certificados_regularidade(codigo_verificacao);
CREATE INDEX idx_cert_reg_validade ON certificados_regularidade(valido_ate, ativo) WHERE NOT cancelado;
CREATE INDEX idx_cert_reg_status ON certificados_regularidade(status, ativo);
CREATE INDEX idx_cert_reg_pendencias ON certificados_regularidade USING gin(pendencias);

-- 4. Criar triggers
CREATE TRIGGER trg_cert_reg_invalidar_anteriores
    AFTER INSERT ON certificados_regularidade
    FOR EACH ROW
    EXECUTE FUNCTION trg_invalidar_certificados_anteriores();

CREATE TRIGGER trg_cert_reg_updated_at
    BEFORE UPDATE ON certificados_regularidade
    FOR EACH ROW
    EXECUTE FUNCTION trg_updated_at();

-- 5. Habilitar RLS
ALTER TABLE certificados_regularidade ENABLE ROW LEVEL SECURITY;

-- 6. Criar policies
CREATE POLICY pol_cert_reg_credenciado ON certificados_regularidade
    FOR SELECT
    USING (
        credenciado_id IN (
            SELECT id FROM credenciados WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'gestor')
        )
    );

CREATE POLICY pol_cert_reg_insert ON certificados_regularidade
    FOR INSERT
    WITH CHECK (
        credenciado_id IN (
            SELECT id FROM credenciados WHERE id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'gestor')
        )
    );