-- ============================================
-- ITEM 1: CORRIGIR FLUXO DE CREDENCIAMENTO
-- ============================================

-- Garantir que trigger de criação de contrato existe
CREATE OR REPLACE FUNCTION public.ensure_contrato_on_aprovacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_numero_contrato TEXT;
  v_contrato_id UUID;
BEGIN
  IF NEW.status = 'aprovado' AND (OLD IS NULL OR OLD.status != 'aprovado') THEN
    -- Verificar se já existe contrato
    SELECT id INTO v_contrato_id
    FROM public.contratos
    WHERE inscricao_id = NEW.inscricao_id;
    
    IF v_contrato_id IS NULL THEN
      v_numero_contrato := 'CONT-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
      
      INSERT INTO public.contratos (
        inscricao_id,
        analise_id,
        numero_contrato,
        status,
        dados_contrato
      )
      VALUES (
        NEW.inscricao_id,
        NEW.id,
        v_numero_contrato,
        'pendente_assinatura',
        jsonb_build_object('tipo', 'credenciamento', 'data_geracao', now())
      )
      RETURNING id INTO v_contrato_id;
      
      RAISE NOTICE '[FLUXO] Contrato % criado para análise %', v_numero_contrato, NEW.id;
    ELSE
      RAISE NOTICE '[FLUXO] Contrato já existe para inscrição %', NEW.inscricao_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger se não existir
DROP TRIGGER IF EXISTS trigger_ensure_contrato_on_aprovacao ON public.analises;
CREATE TRIGGER trigger_ensure_contrato_on_aprovacao
  AFTER INSERT OR UPDATE ON public.analises
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_contrato_on_aprovacao();

-- ============================================
-- ITEM 3: SISTEMA DE PRAZOS E ALERTAS
-- ============================================

-- Tabela de prazos
CREATE TABLE IF NOT EXISTS public.prazos_credenciamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  tipo_prazo TEXT NOT NULL, -- 'validade_certificado', 'renovacao_crm', 'renovacao_cadastro'
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'alertado', 'vencido'
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_prazos_vencimento ON public.prazos_credenciamento(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_prazos_credenciado ON public.prazos_credenciamento(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_prazos_status ON public.prazos_credenciamento(status);

-- Tabela de alertas enviados
CREATE TABLE IF NOT EXISTS public.alertas_enviados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prazo_id UUID NOT NULL REFERENCES public.prazos_credenciamento(id) ON DELETE CASCADE,
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  tipo_alerta TEXT NOT NULL, -- '30_dias', '15_dias', '7_dias', '1_dia', 'vencido'
  email_enviado_para TEXT NOT NULL,
  enviado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status_envio TEXT DEFAULT 'enviado', -- 'enviado', 'falhou', 'pendente'
  erro_envio TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_alertas_prazo ON public.alertas_enviados(prazo_id);
CREATE INDEX IF NOT EXISTS idx_alertas_credenciado ON public.alertas_enviados(credenciado_id);

-- RLS para prazos
ALTER TABLE public.prazos_credenciamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar prazos"
  ON public.prazos_credenciamento
  FOR ALL
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Credenciados podem ver seus prazos"
  ON public.prazos_credenciamento
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = prazos_credenciamento.credenciado_id
      AND ie.candidato_id = auth.uid()
  ));

-- RLS para alertas
ALTER TABLE public.alertas_enviados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver alertas"
  ON public.alertas_enviados
  FOR SELECT
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema pode criar alertas"
  ON public.alertas_enviados
  FOR INSERT
  WITH CHECK (true);

-- Função para verificar prazos vencendo
CREATE OR REPLACE FUNCTION public.verificar_prazos_vencendo()
RETURNS TABLE(
  prazo_id UUID,
  credenciado_id UUID,
  credenciado_nome TEXT,
  credenciado_email TEXT,
  tipo_prazo TEXT,
  data_vencimento DATE,
  dias_restantes INTEGER,
  tipo_alerta TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.credenciado_id,
    c.nome,
    c.email,
    p.tipo_prazo,
    p.data_vencimento,
    (p.data_vencimento - CURRENT_DATE)::INTEGER as dias_restantes,
    CASE 
      WHEN p.data_vencimento - CURRENT_DATE = 30 THEN '30_dias'
      WHEN p.data_vencimento - CURRENT_DATE = 15 THEN '15_dias'
      WHEN p.data_vencimento - CURRENT_DATE = 7 THEN '7_dias'
      WHEN p.data_vencimento - CURRENT_DATE = 1 THEN '1_dia'
      WHEN p.data_vencimento < CURRENT_DATE THEN 'vencido'
      ELSE NULL
    END::TEXT as tipo_alerta
  FROM public.prazos_credenciamento p
  JOIN public.credenciados c ON c.id = p.credenciado_id
  WHERE p.status = 'ativo'
    AND (
      p.data_vencimento - CURRENT_DATE IN (30, 15, 7, 1)
      OR p.data_vencimento < CURRENT_DATE
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.alertas_enviados a
      WHERE a.prazo_id = p.id
        AND a.tipo_alerta = CASE 
          WHEN p.data_vencimento - CURRENT_DATE = 30 THEN '30_dias'
          WHEN p.data_vencimento - CURRENT_DATE = 15 THEN '15_dias'
          WHEN p.data_vencimento - CURRENT_DATE = 7 THEN '7_dias'
          WHEN p.data_vencimento - CURRENT_DATE = 1 THEN '1_dia'
          WHEN p.data_vencimento < CURRENT_DATE THEN 'vencido'
        END
        AND a.enviado_em > CURRENT_DATE - INTERVAL '24 hours'
    );
END;
$$;

-- ============================================
-- ITEM 4: AUDITORIA COMPLETA (preparação)
-- ============================================

-- Tabela já existe (audit_logs), adicionar índices
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);

-- Trigger para auditar mudanças em credenciados
CREATE OR REPLACE FUNCTION public.audit_credenciado_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    PERFORM public.log_audit_event(
      'credenciado_status_changed',
      'credenciado',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object(
        'status_anterior', OLD.status,
        'status_novo', NEW.status,
        'motivo', NEW.motivo_suspensao
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_credenciado ON public.credenciados;
CREATE TRIGGER trigger_audit_credenciado
  AFTER UPDATE ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_credenciado_changes();

-- ============================================
-- PROCESSAR INSCRIÇÕES PENDENTES
-- ============================================

-- Criar análises aprovadas para inscrições que foram aprovadas mas não têm análise
INSERT INTO public.analises (inscricao_id, status, analisado_em)
SELECT 
  ie.id,
  'aprovado',
  NOW()
FROM public.inscricoes_edital ie
LEFT JOIN public.analises a ON a.inscricao_id = ie.id
WHERE ie.status = 'aprovado'
  AND a.id IS NULL
ON CONFLICT (inscricao_id) DO NOTHING;

-- Comentários
COMMENT ON TABLE public.prazos_credenciamento IS 'Gerenciamento de prazos e vencimentos de credenciados';
COMMENT ON TABLE public.alertas_enviados IS 'Histórico de alertas enviados sobre prazos';
COMMENT ON FUNCTION public.verificar_prazos_vencendo IS 'Retorna prazos que precisam de alerta';
COMMENT ON FUNCTION public.ensure_contrato_on_aprovacao IS 'Garante criação de contrato quando análise é aprovada';