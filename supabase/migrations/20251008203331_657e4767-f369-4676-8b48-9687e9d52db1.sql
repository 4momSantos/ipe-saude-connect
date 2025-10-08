-- =========================================
-- FLUXO DE CREDENCIAMENTO SEM WORKFLOW
-- =========================================

-- 1. TABELA DE ANÁLISES
CREATE TABLE IF NOT EXISTS public.analises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes_edital(id) ON DELETE CASCADE,
  analista_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_analise', 'aprovado', 'reprovado')),
  parecer TEXT,
  documentos_analisados JSONB DEFAULT '[]'::jsonb,
  motivo_reprovacao TEXT,
  analisado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(inscricao_id)
);

-- 2. TABELA DE CONTRATOS
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes_edital(id) ON DELETE CASCADE,
  analise_id UUID NOT NULL REFERENCES public.analises(id) ON DELETE CASCADE,
  numero_contrato TEXT UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'credenciamento',
  documento_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente_assinatura' CHECK (status IN ('pendente_assinatura', 'aguardando_assinatura', 'assinado', 'cancelado')),
  dados_contrato JSONB DEFAULT '{}'::jsonb,
  gerado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assinado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(inscricao_id)
);

-- 3. TABELA DE CERTIFICADOS
CREATE TABLE IF NOT EXISTS public.certificados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  numero_certificado TEXT UNIQUE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'credenciamento',
  documento_url TEXT,
  dados_certificado JSONB DEFAULT '{}'::jsonb,
  emitido_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valido_ate TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'revogado', 'expirado')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =========================================
-- ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_analises_status ON public.analises(status);
CREATE INDEX IF NOT EXISTS idx_analises_inscricao ON public.analises(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_analises_analista ON public.analises(analista_id);
CREATE INDEX IF NOT EXISTS idx_analises_created_at ON public.analises(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contratos_status ON public.contratos(status);
CREATE INDEX IF NOT EXISTS idx_contratos_inscricao ON public.contratos(inscricao_id);
CREATE INDEX IF NOT EXISTS idx_contratos_numero ON public.contratos(numero_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_created_at ON public.contratos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificados_credenciado ON public.certificados(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_certificados_numero ON public.certificados(numero_certificado);
CREATE INDEX IF NOT EXISTS idx_certificados_status ON public.certificados(status);
CREATE INDEX IF NOT EXISTS idx_certificados_validade ON public.certificados(valido_ate);

-- =========================================
-- TRIGGERS DE ATUALIZAÇÃO
-- =========================================

-- Trigger para update_updated_at em analises
CREATE TRIGGER update_analises_updated_at
  BEFORE UPDATE ON public.analises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para update_updated_at em contratos
CREATE TRIGGER update_contratos_updated_at
  BEFORE UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para update_updated_at em certificados
CREATE TRIGGER update_certificados_updated_at
  BEFORE UPDATE ON public.certificados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- TRIGGERS DE FLUXO AUTOMÁTICO
-- =========================================

-- 1. Quando inscrição vai para "em_analise" → cria análise
CREATE OR REPLACE FUNCTION public.create_analise_on_inscricao()
RETURNS TRIGGER AS $$
BEGIN
  -- Só cria análise se status mudou para em_analise e não existe análise ainda
  IF NEW.status = 'em_analise' AND (OLD IS NULL OR OLD.status != 'em_analise') THEN
    INSERT INTO public.analises (inscricao_id, status)
    VALUES (NEW.id, 'pendente')
    ON CONFLICT (inscricao_id) DO NOTHING;
    
    RAISE NOTICE '[FLUXO] Análise criada para inscrição %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_create_analise_on_inscricao
  AFTER INSERT OR UPDATE ON public.inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION public.create_analise_on_inscricao();

-- 2. Quando análise é aprovada → cria contrato
CREATE OR REPLACE FUNCTION public.create_contrato_on_aprovacao()
RETURNS TRIGGER AS $$
DECLARE
  v_numero_contrato TEXT;
BEGIN
  -- Só cria contrato se status mudou para aprovado
  IF NEW.status = 'aprovado' AND (OLD IS NULL OR OLD.status != 'aprovado') THEN
    -- Gera número de contrato único
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
      jsonb_build_object(
        'tipo', 'credenciamento',
        'data_geracao', now()
      )
    )
    ON CONFLICT (inscricao_id) DO NOTHING;
    
    RAISE NOTICE '[FLUXO] Contrato % criado para inscrição %', v_numero_contrato, NEW.inscricao_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_create_contrato_on_aprovacao
  AFTER INSERT OR UPDATE ON public.analises
  FOR EACH ROW
  EXECUTE FUNCTION public.create_contrato_on_aprovacao();

-- 3. Quando contrato é assinado → ativa credenciado
CREATE OR REPLACE FUNCTION public.activate_credenciado_on_assinatura()
RETURNS TRIGGER AS $$
BEGIN
  -- Só ativa credenciado se status mudou para assinado
  IF NEW.status = 'assinado' AND (OLD IS NULL OR OLD.status != 'assinado') THEN
    -- Atualiza credenciado se já existir
    UPDATE public.credenciados
    SET 
      status = 'Ativo',
      observacoes = COALESCE(observacoes, '') || ' Contrato ' || NEW.numero_contrato || ' assinado em ' || now()::TEXT,
      updated_at = now()
    WHERE inscricao_id = NEW.inscricao_id;
    
    -- Se não existir credenciado, cria um novo
    IF NOT FOUND THEN
      INSERT INTO public.credenciados (
        inscricao_id,
        nome,
        cpf,
        email,
        status,
        observacoes
      )
      SELECT 
        ie.id,
        COALESCE(ie.dados_inscricao->'dadosPessoais'->>'nome', 'Nome não informado'),
        ie.dados_inscricao->'dadosPessoais'->>'cpf',
        ie.dados_inscricao->'dadosPessoais'->>'email',
        'Ativo',
        'Credenciado via contrato ' || NEW.numero_contrato
      FROM public.inscricoes_edital ie
      WHERE ie.id = NEW.inscricao_id;
    END IF;
    
    RAISE NOTICE '[FLUXO] Credenciado ativado para inscrição %', NEW.inscricao_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_activate_credenciado_on_assinatura
  AFTER INSERT OR UPDATE ON public.contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.activate_credenciado_on_assinatura();

-- 4. Quando credenciado é ativado → emite certificado
CREATE OR REPLACE FUNCTION public.emit_certificado_on_ativacao()
RETURNS TRIGGER AS $$
DECLARE
  v_numero_certificado TEXT;
BEGIN
  -- Só emite certificado se status mudou para Ativo
  IF NEW.status = 'Ativo' AND (OLD IS NULL OR OLD.status != 'Ativo') THEN
    -- Gera número de certificado único
    v_numero_certificado := 'CERT-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    INSERT INTO public.certificados (
      credenciado_id,
      numero_certificado,
      tipo,
      dados_certificado,
      valido_ate,
      status
    )
    VALUES (
      NEW.id,
      v_numero_certificado,
      'credenciamento',
      jsonb_build_object(
        'nome', NEW.nome,
        'cpf', NEW.cpf,
        'data_emissao', now(),
        'tipo', 'credenciamento_medico'
      ),
      now() + INTERVAL '2 years', -- Válido por 2 anos
      'ativo'
    )
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE '[FLUXO] Certificado % emitido para credenciado %', v_numero_certificado, NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_emit_certificado_on_ativacao
  AFTER INSERT OR UPDATE ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.emit_certificado_on_ativacao();

-- =========================================
-- RLS POLICIES
-- =========================================

-- ANALISES
ALTER TABLE public.analises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analistas podem ver todas análises"
  ON public.analises FOR SELECT
  USING (has_role(auth.uid(), 'analista') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Analistas podem criar análises"
  ON public.analises FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'analista') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Analistas podem atualizar análises"
  ON public.analises FOR UPDATE
  USING (has_role(auth.uid(), 'analista') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Candidatos podem ver suas análises"
  ON public.analises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inscricoes_edital ie
      WHERE ie.id = analises.inscricao_id
      AND ie.candidato_id = auth.uid()
    )
  );

-- CONTRATOS
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver todos contratos"
  ON public.contratos FOR SELECT
  USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode criar contratos"
  ON public.contratos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Sistema pode atualizar contratos"
  ON public.contratos FOR UPDATE
  USING (true);

CREATE POLICY "Candidatos podem ver seus contratos"
  ON public.contratos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inscricoes_edital ie
      WHERE ie.id = contratos.inscricao_id
      AND ie.candidato_id = auth.uid()
    )
  );

-- CERTIFICADOS
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver todos certificados"
  ON public.certificados FOR SELECT
  USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Sistema pode criar certificados"
  ON public.certificados FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Credenciados podem ver seus certificados"
  ON public.certificados FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.credenciados c
      JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
      WHERE c.id = certificados.credenciado_id
      AND ie.candidato_id = auth.uid()
    )
  );