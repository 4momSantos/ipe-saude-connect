-- =====================================================
-- FASE 1: Tabela inscricao_validacoes
-- Descrição: Registro de validações de documentos por analistas
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inscricao_validacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes_edital(id) ON DELETE CASCADE,
  analista_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  documento_id UUID REFERENCES public.inscricao_documentos(id) ON DELETE SET NULL,
  
  -- Status da validação
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'aguardando_correcao')),
  
  -- Comentários e dados OCR
  comentario_analista TEXT,
  ocr_validado BOOLEAN DEFAULT false,
  dados_ocr_esperado JSONB,
  dados_ocr_real JSONB,
  discrepancias JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_inscricao_validacoes_inscricao ON public.inscricao_validacoes(inscricao_id);
CREATE INDEX idx_inscricao_validacoes_analista ON public.inscricao_validacoes(analista_id);
CREATE INDEX idx_inscricao_validacoes_documento ON public.inscricao_validacoes(documento_id);
CREATE INDEX idx_inscricao_validacoes_status ON public.inscricao_validacoes(status);
CREATE INDEX idx_inscricao_validacoes_created ON public.inscricao_validacoes(created_at DESC);

-- Comentários
COMMENT ON TABLE public.inscricao_validacoes IS 'Registro de validações de documentos realizadas por analistas';
COMMENT ON COLUMN public.inscricao_validacoes.dados_ocr_esperado IS 'Dados esperados do documento (ex: CPF do candidato)';
COMMENT ON COLUMN public.inscricao_validacoes.dados_ocr_real IS 'Dados extraídos pelo OCR do documento';
COMMENT ON COLUMN public.inscricao_validacoes.discrepancias IS 'Array de diferenças encontradas entre esperado e real';

-- RLS Policies
ALTER TABLE public.inscricao_validacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analistas podem criar validações"
ON public.inscricao_validacoes
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'analista'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Analistas podem ver validações"
ON public.inscricao_validacoes
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'analista'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Candidatos veem suas validações"
ON public.inscricao_validacoes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inscricoes_edital
    WHERE id = inscricao_validacoes.inscricao_id
      AND candidato_id = auth.uid()
  )
);

CREATE POLICY "Analistas atualizam suas validações"
ON public.inscricao_validacoes
FOR UPDATE
TO authenticated
USING (
  analista_id = auth.uid() OR
  has_role(auth.uid(), 'gestor'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- =====================================================
-- FASE 2: Tabela inscricao_eventos
-- Descrição: Log de auditoria de eventos em inscrições
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inscricao_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes_edital(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  descricao TEXT,
  dados JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_inscricao_eventos_inscricao ON public.inscricao_eventos(inscricao_id);
CREATE INDEX idx_inscricao_eventos_tipo ON public.inscricao_eventos(tipo_evento);
CREATE INDEX idx_inscricao_eventos_usuario ON public.inscricao_eventos(usuario_id);
CREATE INDEX idx_inscricao_eventos_timestamp ON public.inscricao_eventos(timestamp DESC);
CREATE INDEX idx_inscricao_eventos_inscricao_timestamp ON public.inscricao_eventos(inscricao_id, timestamp DESC);

-- Comentários
COMMENT ON TABLE public.inscricao_eventos IS 'Log de auditoria imutável de eventos em inscrições';
COMMENT ON COLUMN public.inscricao_eventos.tipo_evento IS 'Ex: documento_enviado, status_alterado, validacao_realizada, mensagem_enviada';
COMMENT ON COLUMN public.inscricao_eventos.dados IS 'Payload JSON com detalhes do evento (ex: documento_id, status_anterior, etc)';

-- RLS Policies
ALTER TABLE public.inscricao_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sistema pode inserir eventos"
ON public.inscricao_eventos
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Analistas veem todos eventos"
ON public.inscricao_eventos
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'analista'::app_role) OR 
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Candidatos veem seus eventos"
ON public.inscricao_eventos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.inscricoes_edital
    WHERE id = inscricao_eventos.inscricao_id
      AND candidato_id = auth.uid()
  )
);

-- =====================================================
-- FASE 3: Alterações em inscricoes_edital
-- Descrição: Adicionar controle de validação
-- =====================================================

ALTER TABLE public.inscricoes_edital 
ADD COLUMN IF NOT EXISTS validacao_status TEXT DEFAULT 'pendente' 
  CHECK (validacao_status IN ('pendente', 'validando', 'aprovada', 'rejeitada', 'aguardando_correcao'));

ALTER TABLE public.inscricoes_edital 
ADD COLUMN IF NOT EXISTS data_validacao TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_inscricoes_validacao_status 
ON public.inscricoes_edital(validacao_status);

CREATE INDEX IF NOT EXISTS idx_inscricoes_validacao_status_data 
ON public.inscricoes_edital(validacao_status, data_validacao DESC);

COMMENT ON COLUMN public.inscricoes_edital.validacao_status IS 'Status geral de validação da inscrição (difere de status do workflow)';
COMMENT ON COLUMN public.inscricoes_edital.data_validacao IS 'Data/hora em que a validação foi concluída (aprovada ou rejeitada)';

-- =====================================================
-- FASE 4: View view_inscricoes_validacao_pendente
-- Descrição: Dashboard de validações pendentes
-- =====================================================

CREATE OR REPLACE VIEW public.view_inscricoes_validacao_pendente AS
SELECT 
  ie.id AS inscricao_id,
  ie.candidato_id,
  p.nome AS candidato_nome,
  p.email AS candidato_email,
  e.titulo AS edital_titulo,
  ie.validacao_status,
  ie.data_validacao,
  ie.created_at AS data_inscricao,
  
  COUNT(DISTINCT id_doc.id) AS total_documentos,
  COUNT(DISTINCT id_doc.id) FILTER (WHERE id_doc.status = 'aprovado') AS documentos_aprovados,
  COUNT(DISTINCT id_doc.id) FILTER (WHERE id_doc.status = 'rejeitado') AS documentos_rejeitados,
  COUNT(DISTINCT id_doc.id) FILTER (WHERE id_doc.status = 'pendente') AS documentos_pendentes,
  
  MAX(iv.created_at) AS ultima_validacao,
  STRING_AGG(DISTINCT p_analista.nome, ', ' ORDER BY p_analista.nome) AS analistas

FROM public.inscricoes_edital ie
JOIN public.profiles p ON p.id = ie.candidato_id
JOIN public.editais e ON e.id = ie.edital_id
LEFT JOIN public.inscricao_documentos id_doc ON id_doc.inscricao_id = ie.id
LEFT JOIN public.inscricao_validacoes iv ON iv.inscricao_id = ie.id
LEFT JOIN public.profiles p_analista ON p_analista.id = iv.analista_id

WHERE ie.validacao_status IN ('pendente', 'validando', 'aguardando_correcao')
  AND ie.is_rascunho = false

GROUP BY 
  ie.id, 
  ie.candidato_id, 
  p.nome, 
  p.email, 
  e.titulo, 
  ie.validacao_status, 
  ie.data_validacao, 
  ie.created_at;

COMMENT ON VIEW public.view_inscricoes_validacao_pendente IS 'Dashboard de inscrições aguardando validação com métricas agregadas';

-- =====================================================
-- FASE 5: Funções Helper
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_inscricao_evento(
  p_inscricao_id UUID,
  p_tipo_evento TEXT,
  p_descricao TEXT DEFAULT NULL,
  p_dados JSONB DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evento_id UUID;
  v_user_id UUID;
BEGIN
  v_user_id := COALESCE(p_usuario_id, auth.uid());
  
  INSERT INTO public.inscricao_eventos (
    inscricao_id,
    tipo_evento,
    usuario_id,
    descricao,
    dados
  )
  VALUES (
    p_inscricao_id,
    p_tipo_evento,
    v_user_id,
    p_descricao,
    p_dados
  )
  RETURNING id INTO v_evento_id;
  
  RETURN v_evento_id;
END;
$$;

COMMENT ON FUNCTION public.log_inscricao_evento IS 'Helper para criar eventos de inscrição de forma padronizada';

CREATE OR REPLACE FUNCTION public.validar_documento(
  p_documento_id UUID,
  p_status TEXT,
  p_comentario TEXT DEFAULT NULL,
  p_discrepancias JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_validacao_id UUID;
  v_inscricao_id UUID;
  v_analista_id UUID := auth.uid();
BEGIN
  IF NOT (has_role(v_analista_id, 'analista'::app_role) OR 
          has_role(v_analista_id, 'gestor'::app_role) OR 
          has_role(v_analista_id, 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Usuário não tem permissão para validar documentos';
  END IF;
  
  SELECT inscricao_id INTO v_inscricao_id
  FROM public.inscricao_documentos
  WHERE id = p_documento_id;
  
  IF v_inscricao_id IS NULL THEN
    RAISE EXCEPTION 'Documento não encontrado: %', p_documento_id;
  END IF;
  
  INSERT INTO public.inscricao_validacoes (
    inscricao_id,
    analista_id,
    documento_id,
    status,
    comentario_analista,
    discrepancias,
    ocr_validado
  )
  VALUES (
    v_inscricao_id,
    v_analista_id,
    p_documento_id,
    p_status,
    p_comentario,
    p_discrepancias,
    p_discrepancias IS NOT NULL
  )
  RETURNING id INTO v_validacao_id;
  
  UPDATE public.inscricao_documentos
  SET 
    status = p_status,
    analisado_por = v_analista_id,
    analisado_em = NOW()
  WHERE id = p_documento_id;
  
  PERFORM public.log_inscricao_evento(
    v_inscricao_id,
    'documento_validado',
    format('Documento validado com status: %s', p_status),
    jsonb_build_object(
      'documento_id', p_documento_id,
      'status', p_status,
      'analista_id', v_analista_id,
      'comentario', p_comentario
    )
  );
  
  RETURN v_validacao_id;
END;
$$;

COMMENT ON FUNCTION public.validar_documento IS 'Valida um documento, atualiza status e registra eventos automaticamente';

-- =====================================================
-- FASE 6: Triggers Automáticos
-- =====================================================

CREATE OR REPLACE FUNCTION public.trigger_inscricao_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_inscricao_evento(
      NEW.id,
      'status_alterado',
      format('Status alterado de %s para %s', OLD.status, NEW.status),
      jsonb_build_object(
        'status_anterior', OLD.status,
        'status_novo', NEW.status
      )
    );
  END IF;
  
  IF OLD.validacao_status IS DISTINCT FROM NEW.validacao_status THEN
    PERFORM public.log_inscricao_evento(
      NEW.id,
      'validacao_status_alterado',
      format('Status de validação alterado de %s para %s', OLD.validacao_status, NEW.validacao_status),
      jsonb_build_object(
        'validacao_status_anterior', OLD.validacao_status,
        'validacao_status_novo', NEW.validacao_status
      )
    );
    
    IF NEW.validacao_status IN ('aprovada', 'rejeitada') AND OLD.validacao_status NOT IN ('aprovada', 'rejeitada') THEN
      NEW.data_validacao := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_inscricao_eventos_status
  BEFORE UPDATE ON public.inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_inscricao_status_change();

CREATE OR REPLACE FUNCTION public.trigger_documento_enviado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_inscricao_evento(
      NEW.inscricao_id,
      'documento_enviado',
      format('Documento enviado: %s', NEW.tipo_documento),
      jsonb_build_object(
        'documento_id', NEW.id,
        'tipo_documento', NEW.tipo_documento,
        'arquivo_nome', NEW.arquivo_nome
      ),
      NEW.uploaded_by
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_documento_enviado
  AFTER INSERT ON public.inscricao_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_documento_enviado();