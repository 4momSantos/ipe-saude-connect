-- ========================================
-- TABELA: controle_prazos
-- Sistema centralizado de prazos
-- ========================================
CREATE TABLE IF NOT EXISTS public.controle_prazos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Entidade relacionada (polimórfico)
    entidade_tipo TEXT NOT NULL,
    entidade_id UUID NOT NULL,
    entidade_nome TEXT,
    
    -- Dono/responsável
    credenciado_id UUID REFERENCES public.credenciados(id),
    responsavel_id UUID REFERENCES auth.users(id),
    
    -- Datas
    data_emissao DATE,
    data_vencimento DATE NOT NULL,
    data_renovacao DATE,
    
    -- Alertas
    dias_alerta_1 INTEGER DEFAULT 30,
    dias_alerta_2 INTEGER DEFAULT 15,
    dias_alerta_3 INTEGER DEFAULT 7,
    
    -- Status calculado automaticamente
    status_atual TEXT DEFAULT 'valido',
    dias_para_vencer INTEGER,
    
    -- Ações
    renovavel BOOLEAN DEFAULT TRUE,
    bloqueio_automatico BOOLEAN DEFAULT FALSE,
    
    -- Histórico de notificações
    notificacoes_enviadas INTEGER DEFAULT 0,
    ultima_notificacao_em TIMESTAMP WITH TIME ZONE,
    proxima_notificacao DATE,
    
    -- Estado
    ativo BOOLEAN DEFAULT TRUE,
    renovado BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    
    -- Auditoria
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(entidade_tipo, entidade_id)
);

-- ========================================
-- TABELA: historico_vencimentos
-- ========================================
CREATE TABLE IF NOT EXISTS public.historico_vencimentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    controle_prazo_id UUID REFERENCES public.controle_prazos(id) ON DELETE CASCADE,
    
    status_anterior TEXT,
    status_novo TEXT NOT NULL,
    data_mudanca TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    acao TEXT,
    acao_por UUID REFERENCES auth.users(id),
    
    detalhes JSONB,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABELA: alertas_vencimento
-- ========================================
CREATE TABLE IF NOT EXISTS public.alertas_vencimento (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    entidade_tipo TEXT NOT NULL,
    categoria TEXT,
    
    notificar_credenciado BOOLEAN DEFAULT TRUE,
    notificar_gestores BOOLEAN DEFAULT TRUE,
    grupos_notificar UUID[],
    emails_adicionais TEXT[],
    
    template_titulo TEXT,
    template_mensagem TEXT,
    
    dias_antecedencia INTEGER[] DEFAULT ARRAY[30, 15, 7, 1],
    prioridade TEXT DEFAULT 'normal',
    
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- VIEW: v_prazos_completos
-- ========================================
CREATE OR REPLACE VIEW v_prazos_completos AS
SELECT 
    cp.id,
    cp.entidade_tipo,
    cp.entidade_id,
    cp.entidade_nome,
    cp.credenciado_id,
    c.nome AS credenciado_nome,
    c.cpf AS credenciado_cpf,
    cp.data_emissao,
    cp.data_vencimento,
    cp.data_renovacao,
    cp.status_atual,
    
    cp.data_vencimento - CURRENT_DATE AS dias_para_vencer,
    CASE 
        WHEN cp.data_vencimento < CURRENT_DATE THEN 'vencido'
        WHEN cp.data_vencimento <= CURRENT_DATE + cp.dias_alerta_3 THEN 'critico'
        WHEN cp.data_vencimento <= CURRENT_DATE + cp.dias_alerta_2 THEN 'atencao'
        WHEN cp.data_vencimento <= CURRENT_DATE + cp.dias_alerta_1 THEN 'vencendo'
        ELSE 'valido'
    END AS nivel_alerta,
    
    CASE 
        WHEN cp.data_vencimento < CURRENT_DATE THEN '#ef4444'
        WHEN cp.data_vencimento <= CURRENT_DATE + cp.dias_alerta_3 THEN '#f97316'
        WHEN cp.data_vencimento <= CURRENT_DATE + cp.dias_alerta_2 THEN '#f59e0b'
        WHEN cp.data_vencimento <= CURRENT_DATE + cp.dias_alerta_1 THEN '#eab308'
        ELSE '#10b981'
    END AS cor_status,
    
    cp.notificacoes_enviadas,
    cp.ultima_notificacao_em,
    cp.proxima_notificacao,
    
    cp.ativo,
    cp.renovado,
    cp.renovavel,
    cp.bloqueio_automatico,
    cp.observacoes,
    
    cp.criado_em,
    cp.atualizado_em
FROM controle_prazos cp
LEFT JOIN credenciados c ON c.id = cp.credenciado_id
WHERE cp.ativo = TRUE;

-- ========================================
-- VIEW: v_dashboard_vencimentos
-- ========================================
CREATE OR REPLACE VIEW v_dashboard_vencimentos AS
SELECT 
    COUNT(*) AS total_prazos,
    COUNT(*) FILTER (WHERE status_atual = 'valido') AS total_validos,
    COUNT(*) FILTER (WHERE status_atual = 'vencendo') AS total_vencendo,
    COUNT(*) FILTER (WHERE status_atual = 'vencido') AS total_vencidos,
    
    COUNT(*) FILTER (WHERE nivel_alerta = 'critico') AS criticos,
    COUNT(*) FILTER (WHERE nivel_alerta = 'atencao') AS atencao,
    
    COUNT(*) FILTER (WHERE dias_para_vencer <= 7 AND dias_para_vencer >= 0) AS vencem_7_dias,
    COUNT(*) FILTER (WHERE dias_para_vencer <= 15 AND dias_para_vencer >= 0) AS vencem_15_dias,
    COUNT(*) FILTER (WHERE dias_para_vencer <= 30 AND dias_para_vencer >= 0) AS vencem_30_dias,
    
    COUNT(*) FILTER (WHERE dias_para_vencer < -90) AS vencidos_90_dias,
    COUNT(*) FILTER (WHERE dias_para_vencer < -30) AS vencidos_30_dias,
    
    MAX(atualizado_em) AS ultima_atualizacao
FROM v_prazos_completos;

-- ========================================
-- ÍNDICES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_prazos_vencimento ON controle_prazos(data_vencimento) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_prazos_status ON controle_prazos(status_atual) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_prazos_credenciado ON controle_prazos(credenciado_id) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_prazos_entidade ON controle_prazos(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_prazos_proxima_notif ON controle_prazos(proxima_notificacao) WHERE proxima_notificacao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_historico_prazo ON historico_vencimentos(controle_prazo_id, data_mudanca DESC);

-- ========================================
-- FUNÇÃO: atualizar_status_prazos
-- ========================================
CREATE OR REPLACE FUNCTION atualizar_status_prazos()
RETURNS TABLE (
    total_atualizados INTEGER,
    novos_vencidos INTEGER,
    novos_alertas INTEGER
) AS $$
DECLARE
    v_atualizados INTEGER := 0;
    v_vencidos INTEGER := 0;
    v_alertas INTEGER := 0;
    v_prazo RECORD;
    v_novo_status TEXT;
    v_dias_ate_vencer INTEGER;
    v_deve_notificar BOOLEAN;
BEGIN
    FOR v_prazo IN 
        SELECT * FROM controle_prazos WHERE ativo = TRUE
    LOOP
        v_dias_ate_vencer := v_prazo.data_vencimento - CURRENT_DATE;
        
        IF v_prazo.data_vencimento < CURRENT_DATE THEN
            v_novo_status := 'vencido';
        ELSIF v_prazo.data_vencimento <= CURRENT_DATE + v_prazo.dias_alerta_3 THEN
            v_novo_status := 'vencendo';
        ELSE
            v_novo_status := 'valido';
        END IF;
        
        IF v_novo_status != v_prazo.status_atual THEN
            UPDATE controle_prazos
            SET 
                status_atual = v_novo_status,
                dias_para_vencer = v_dias_ate_vencer,
                atualizado_em = NOW()
            WHERE id = v_prazo.id;
            
            INSERT INTO historico_vencimentos (
                controle_prazo_id,
                status_anterior,
                status_novo,
                acao
            ) VALUES (
                v_prazo.id,
                v_prazo.status_atual,
                v_novo_status,
                'atualizacao_automatica'
            );
            
            v_atualizados := v_atualizados + 1;
            
            IF v_novo_status = 'vencido' THEN
                v_vencidos := v_vencidos + 1;
                
                IF v_prazo.bloqueio_automatico AND v_prazo.credenciado_id IS NOT NULL THEN
                    UPDATE credenciados
                    SET 
                        status = 'Suspenso',
                        motivo_suspensao = 'Documento vencido: ' || v_prazo.entidade_nome,
                        suspensao_automatica = TRUE,
                        suspensao_inicio = CURRENT_DATE
                    WHERE id = v_prazo.credenciado_id;
                END IF;
            END IF;
        END IF;
        
        v_deve_notificar := FALSE;
        
        IF v_dias_ate_vencer = v_prazo.dias_alerta_1 
           OR v_dias_ate_vencer = v_prazo.dias_alerta_2 
           OR v_dias_ate_vencer = v_prazo.dias_alerta_3 
           OR v_dias_ate_vencer = 0
           OR (v_dias_ate_vencer < 0 AND v_dias_ate_vencer % 7 = 0) THEN
            v_deve_notificar := TRUE;
        END IF;
        
        IF v_deve_notificar AND (v_prazo.ultima_notificacao_em IS NULL 
           OR v_prazo.ultima_notificacao_em::DATE < CURRENT_DATE) THEN
            
            IF v_prazo.responsavel_id IS NOT NULL THEN
                INSERT INTO app_notifications (
                    user_id,
                    type,
                    title,
                    message,
                    related_type,
                    related_id
                ) VALUES (
                    v_prazo.responsavel_id,
                    CASE 
                        WHEN v_dias_ate_vencer < 0 THEN 'error'
                        WHEN v_dias_ate_vencer <= 7 THEN 'warning'
                        ELSE 'info'
                    END,
                    CASE 
                        WHEN v_dias_ate_vencer < 0 THEN '🚨 Documento VENCIDO'
                        WHEN v_dias_ate_vencer = 0 THEN '⚠️ Documento vence HOJE'
                        ELSE '⏰ Documento vencendo em ' || v_dias_ate_vencer || ' dias'
                    END,
                    v_prazo.entidade_nome || ' - ' || v_prazo.entidade_tipo,
                    'prazo',
                    v_prazo.id
                );
            END IF;
            
            UPDATE controle_prazos
            SET 
                notificacoes_enviadas = notificacoes_enviadas + 1,
                ultima_notificacao_em = NOW(),
                proxima_notificacao = CURRENT_DATE + 7
            WHERE id = v_prazo.id;
            
            v_alertas := v_alertas + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT v_atualizados, v_vencidos, v_alertas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- FUNÇÃO: renovar_prazo
-- ========================================
CREATE OR REPLACE FUNCTION renovar_prazo(
    p_prazo_id UUID,
    p_nova_data_vencimento DATE,
    p_observacao TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_prazo RECORD;
BEGIN
    SELECT * INTO v_prazo FROM controle_prazos WHERE id = p_prazo_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Prazo não encontrado');
    END IF;
    
    INSERT INTO historico_vencimentos (
        controle_prazo_id,
        status_anterior,
        status_novo,
        acao,
        acao_por,
        detalhes
    ) VALUES (
        p_prazo_id,
        v_prazo.status_atual,
        'renovado',
        'renovacao',
        auth.uid(),
        jsonb_build_object(
            'data_vencimento_anterior', v_prazo.data_vencimento,
            'data_vencimento_nova', p_nova_data_vencimento,
            'observacao', p_observacao
        )
    );
    
    UPDATE controle_prazos
    SET 
        data_vencimento = p_nova_data_vencimento,
        data_renovacao = CURRENT_DATE,
        status_atual = 'valido',
        renovado = TRUE,
        observacoes = COALESCE(p_observacao, observacoes),
        notificacoes_enviadas = 0,
        ultima_notificacao_em = NULL,
        proxima_notificacao = NULL,
        atualizado_em = NOW()
    WHERE id = p_prazo_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'prazo_id', p_prazo_id,
        'nova_data', p_nova_data_vencimento
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- FUNÇÃO: migrar_prazos_existentes
-- ========================================
CREATE OR REPLACE FUNCTION migrar_prazos_existentes()
RETURNS TABLE (
    total_migrados INTEGER,
    erros TEXT[]
) AS $$
DECLARE
    v_migrados INTEGER := 0;
    v_erros TEXT[] := ARRAY[]::TEXT[];
    v_prazo RECORD;
BEGIN
    FOR v_prazo IN 
        SELECT * FROM prazos_credenciamento WHERE status = 'ativo'
    LOOP
        BEGIN
            INSERT INTO controle_prazos (
                entidade_tipo,
                entidade_id,
                entidade_nome,
                credenciado_id,
                data_vencimento,
                status_atual,
                bloqueio_automatico,
                ativo
            ) VALUES (
                v_prazo.tipo_prazo,
                v_prazo.id,
                v_prazo.tipo_prazo,
                v_prazo.credenciado_id,
                v_prazo.data_vencimento,
                CASE 
                    WHEN v_prazo.data_vencimento < CURRENT_DATE THEN 'vencido'
                    WHEN v_prazo.data_vencimento <= CURRENT_DATE + 7 THEN 'vencendo'
                    ELSE 'valido'
                END,
                v_prazo.tipo_prazo IN ('CRM', 'CNH', 'validade_certificado'),
                TRUE
            )
            ON CONFLICT (entidade_tipo, entidade_id) DO NOTHING;
            
            v_migrados := v_migrados + 1;
        EXCEPTION WHEN OTHERS THEN
            v_erros := array_append(v_erros, 'Erro ao migrar prazo ' || v_prazo.id || ': ' || SQLERRM);
        END;
    END LOOP;
    
    RETURN QUERY SELECT v_migrados, v_erros;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- TRIGGER: Criar prazo para certificados
-- ========================================
CREATE OR REPLACE FUNCTION criar_prazo_certificado()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.valido_ate IS NOT NULL THEN
        INSERT INTO controle_prazos (
            entidade_tipo,
            entidade_id,
            entidade_nome,
            credenciado_id,
            data_emissao,
            data_vencimento,
            bloqueio_automatico,
            ativo
        ) VALUES (
            'certificado',
            NEW.id,
            'Certificado: ' || NEW.numero_certificado,
            NEW.credenciado_id,
            NEW.emitido_em::DATE,
            NEW.valido_ate::DATE,
            TRUE,
            TRUE
        )
        ON CONFLICT (entidade_tipo, entidade_id) 
        DO UPDATE SET
            data_vencimento = EXCLUDED.data_vencimento,
            ativo = TRUE,
            atualizado_em = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_criar_prazo_certificado ON certificados;
CREATE TRIGGER trg_criar_prazo_certificado
    AFTER INSERT OR UPDATE ON certificados
    FOR EACH ROW
    WHEN (NEW.valido_ate IS NOT NULL)
    EXECUTE FUNCTION criar_prazo_certificado();

-- ========================================
-- TRIGGER: Criar prazo para contratos
-- ========================================
CREATE OR REPLACE FUNCTION criar_prazo_contrato()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.dados_contrato IS NOT NULL AND NEW.dados_contrato->>'data_validade' IS NOT NULL THEN
        INSERT INTO controle_prazos (
            entidade_tipo,
            entidade_id,
            entidade_nome,
            credenciado_id,
            data_vencimento,
            bloqueio_automatico,
            ativo
        ) VALUES (
            'contrato',
            NEW.id,
            'Contrato: ' || NEW.numero_contrato,
            (SELECT credenciado_id FROM inscricoes_edital ie 
             JOIN credenciados c ON c.inscricao_id = ie.id 
             WHERE ie.id = NEW.inscricao_id LIMIT 1),
            (NEW.dados_contrato->>'data_validade')::DATE,
            FALSE,
            TRUE
        )
        ON CONFLICT (entidade_tipo, entidade_id) 
        DO UPDATE SET
            data_vencimento = EXCLUDED.data_vencimento,
            ativo = TRUE,
            atualizado_em = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_criar_prazo_contrato ON contratos;
CREATE TRIGGER trg_criar_prazo_contrato
    AFTER INSERT OR UPDATE ON contratos
    FOR EACH ROW
    EXECUTE FUNCTION criar_prazo_contrato();

-- ========================================
-- RLS POLICIES
-- ========================================
ALTER TABLE controle_prazos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_vencimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_vencimento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem prazos relevantes" ON controle_prazos;
CREATE POLICY "Usuários veem prazos relevantes"
    ON controle_prazos FOR SELECT
    USING (
        responsavel_id = auth.uid()
        OR credenciado_id IN (
            SELECT c.id FROM credenciados c
            JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
            WHERE ie.candidato_id = auth.uid()
        )
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
        OR has_role(auth.uid(), 'analista'::app_role)
    );

DROP POLICY IF EXISTS "Gestores gerenciam prazos" ON controle_prazos;
CREATE POLICY "Gestores gerenciam prazos"
    ON controle_prazos FOR ALL
    USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
    );

DROP POLICY IF EXISTS "Usuários veem histórico de prazos relevantes" ON historico_vencimentos;
CREATE POLICY "Usuários veem histórico de prazos relevantes"
    ON historico_vencimentos FOR SELECT
    USING (
        controle_prazo_id IN (
            SELECT id FROM controle_prazos
            WHERE responsavel_id = auth.uid()
            OR credenciado_id IN (
                SELECT c.id FROM credenciados c
                JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
                WHERE ie.candidato_id = auth.uid()
            )
        )
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
        OR has_role(auth.uid(), 'analista'::app_role)
    );

DROP POLICY IF EXISTS "Sistema pode inserir histórico" ON historico_vencimentos;
CREATE POLICY "Sistema pode inserir histórico"
    ON historico_vencimentos FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Gestores gerenciam alertas" ON alertas_vencimento;
CREATE POLICY "Gestores gerenciam alertas"
    ON alertas_vencimento FOR ALL
    USING (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'gestor'::app_role)
    );