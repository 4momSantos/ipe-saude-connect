-- =====================================================
-- ETAPA 1: Criar tabela de correções de inscrição
-- =====================================================

CREATE TABLE IF NOT EXISTS public.correcoes_inscricao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID NOT NULL REFERENCES public.inscricoes_edital(id) ON DELETE CASCADE,
  versao INTEGER NOT NULL DEFAULT 1,
  campos_corrigidos JSONB,
  documentos_reenviados UUID[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'enviada', 'analisada')),
  enviada_em TIMESTAMPTZ,
  candidato_justificativa TEXT,
  analisada_por UUID REFERENCES public.profiles(id),
  analisada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_correcoes_inscricao ON public.correcoes_inscricao(inscricao_id, versao DESC);
CREATE INDEX IF NOT EXISTS idx_correcoes_status ON public.correcoes_inscricao(status, enviada_em);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_correcoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_correcoes_updated_at
  BEFORE UPDATE ON public.correcoes_inscricao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_correcoes_updated_at();

-- =====================================================
-- ETAPA 2: Modificar tabela de documentos para suportar versões
-- =====================================================

ALTER TABLE public.inscricao_documentos 
  ADD COLUMN IF NOT EXISTS versao_anterior_id UUID REFERENCES public.inscricao_documentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS eh_reenvio BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_reenvio TEXT,
  ADD COLUMN IF NOT EXISTS versao INTEGER DEFAULT 1;

-- Índice para buscar versões de documentos
CREATE INDEX IF NOT EXISTS idx_documentos_versoes ON public.inscricao_documentos(inscricao_id, tipo_documento, versao DESC);
CREATE INDEX IF NOT EXISTS idx_documentos_reenvio ON public.inscricao_documentos(eh_reenvio, versao_anterior_id) WHERE eh_reenvio = true;

-- =====================================================
-- ETAPA 3: Trigger para invalidar versão anterior ao reenviar
-- =====================================================

CREATE OR REPLACE FUNCTION public.invalidar_versao_anterior_documento()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é reenvio, marcar versão anterior como não atual
  IF NEW.eh_reenvio = true AND NEW.versao_anterior_id IS NOT NULL THEN
    UPDATE public.inscricao_documentos
    SET is_current = false
    WHERE id = NEW.versao_anterior_id;
    
    RAISE NOTICE '[VERSAO_DOC] Documento % marcado como versão antiga', NEW.versao_anterior_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invalidar_versao_anterior
  AFTER INSERT ON public.inscricao_documentos
  FOR EACH ROW
  WHEN (NEW.eh_reenvio = true)
  EXECUTE FUNCTION public.invalidar_versao_anterior_documento();

-- =====================================================
-- ETAPA 4: Função para iniciar correção de inscrição
-- =====================================================

CREATE OR REPLACE FUNCTION public.iniciar_correcao_inscricao(
  p_inscricao_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_status TEXT;
  v_versao INTEGER;
  v_correcao_id UUID;
BEGIN
  -- Verificar se inscrição pode ser corrigida
  SELECT status INTO v_status
  FROM public.inscricoes_edital
  WHERE id = p_inscricao_id AND candidato_id = auth.uid();
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Inscrição não encontrada ou você não tem permissão';
  END IF;
  
  IF v_status NOT IN ('rejeitada', 'pendente_correcao') THEN
    RAISE EXCEPTION 'Inscrição não está em status que permite correção: %', v_status;
  END IF;
  
  -- Calcular próxima versão
  SELECT COALESCE(MAX(versao), 0) + 1 INTO v_versao
  FROM public.correcoes_inscricao
  WHERE inscricao_id = p_inscricao_id;
  
  -- Criar registro de correção
  INSERT INTO public.correcoes_inscricao (
    inscricao_id,
    versao,
    status
  )
  VALUES (
    p_inscricao_id,
    v_versao,
    'em_andamento'
  )
  RETURNING id INTO v_correcao_id;
  
  RAISE NOTICE '[CORRECAO] Correção % iniciada para inscrição %', v_correcao_id, p_inscricao_id;
  
  RETURN v_correcao_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- ETAPA 5: Função para enviar correção completa
-- =====================================================

CREATE OR REPLACE FUNCTION public.enviar_correcao_inscricao(
  p_correcao_id UUID,
  p_campos_corrigidos JSONB,
  p_documentos_reenviados UUID[],
  p_justificativa TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_inscricao_id UUID;
  v_analista_anterior UUID;
  v_edital_id UUID;
  v_analise_id UUID;
  v_candidato_nome TEXT;
BEGIN
  -- Buscar dados da correção
  SELECT inscricao_id INTO v_inscricao_id
  FROM public.correcoes_inscricao
  WHERE id = p_correcao_id AND status = 'em_andamento';
  
  IF v_inscricao_id IS NULL THEN
    RAISE EXCEPTION 'Correção não encontrada ou já foi enviada';
  END IF;
  
  -- Buscar analista anterior e edital
  SELECT analisado_por, edital_id INTO v_analista_anterior, v_edital_id
  FROM public.inscricoes_edital
  WHERE id = v_inscricao_id;
  
  -- Buscar nome do candidato
  SELECT nome INTO v_candidato_nome
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Atualizar dados da correção
  UPDATE public.correcoes_inscricao
  SET 
    campos_corrigidos = p_campos_corrigidos,
    documentos_reenviados = p_documentos_reenviados,
    candidato_justificativa = p_justificativa,
    status = 'enviada',
    enviada_em = NOW()
  WHERE id = p_correcao_id;
  
  -- Atualizar status da inscrição para em_analise
  UPDATE public.inscricoes_edital
  SET 
    status = 'em_analise',
    updated_at = NOW()
  WHERE id = v_inscricao_id;
  
  -- Criar nova análise
  INSERT INTO public.analises (inscricao_id, status)
  VALUES (v_inscricao_id, 'pendente')
  RETURNING id INTO v_analise_id;
  
  -- Criar notificação para analista anterior (se houver)
  IF v_analista_anterior IS NOT NULL THEN
    INSERT INTO public.app_notifications (
      user_id,
      type,
      title,
      message,
      related_type,
      related_id
    )
    VALUES (
      v_analista_anterior,
      'info',
      'Correção Recebida',
      format('%s enviou correções para reanálise', COALESCE(v_candidato_nome, 'Candidato')),
      'inscricao',
      v_inscricao_id
    );
  END IF;
  
  -- Criar mensagem no chat
  INSERT INTO public.workflow_messages (
    inscricao_id,
    tipo,
    conteudo,
    manifestacao_metadata,
    sender_id
  )
  VALUES (
    v_inscricao_id,
    'correcao_enviada',
    format('Correção enviada para reanálise. %s', COALESCE(p_justificativa, '')),
    jsonb_build_object(
      'correcao_id', p_correcao_id,
      'campos_corrigidos', p_campos_corrigidos,
      'documentos_reenviados', p_documentos_reenviados
    ),
    auth.uid()
  );
  
  RAISE NOTICE '[CORRECAO] Correção % enviada para reanálise', p_correcao_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'correcao_id', p_correcao_id,
    'inscricao_id', v_inscricao_id,
    'analise_id', v_analise_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- ETAPA 6: RLS Policies
-- =====================================================

-- Permitir candidatos verem suas correções
ALTER TABLE public.correcoes_inscricao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidatos podem ver suas correções"
  ON public.correcoes_inscricao FOR SELECT
  USING (
    inscricao_id IN (
      SELECT id FROM public.inscricoes_edital WHERE candidato_id = auth.uid()
    )
  );

CREATE POLICY "Candidatos podem criar correções"
  ON public.correcoes_inscricao FOR INSERT
  WITH CHECK (
    inscricao_id IN (
      SELECT id FROM public.inscricoes_edital WHERE candidato_id = auth.uid()
    )
  );

CREATE POLICY "Candidatos podem atualizar suas correções em andamento"
  ON public.correcoes_inscricao FOR UPDATE
  USING (
    status = 'em_andamento' AND
    inscricao_id IN (
      SELECT id FROM public.inscricoes_edital WHERE candidato_id = auth.uid()
    )
  );

-- Analistas/gestores podem ver e atualizar todas as correções
CREATE POLICY "Analistas podem ver todas correções"
  ON public.correcoes_inscricao FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('analista', 'gestor', 'admin')
    )
  );

CREATE POLICY "Analistas podem marcar correções como analisadas"
  ON public.correcoes_inscricao FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('analista', 'gestor', 'admin')
    )
  );