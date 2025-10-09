-- FASE 8: Feature Toggle para Rollout do Fluxo Programático

-- Adicionar campo use_programmatic_flow em editais
ALTER TABLE public.editais
ADD COLUMN IF NOT EXISTS use_programmatic_flow BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.editais.use_programmatic_flow IS 
  'Feature toggle para ativar fluxo programático (em vez de workflow engine). Default false para rollout gradual.';

-- Criar índice para consultas por flag
CREATE INDEX IF NOT EXISTS idx_editais_programmatic_flow 
  ON public.editais(use_programmatic_flow) 
  WHERE use_programmatic_flow = true;

-- Criar tabela de auditoria de rollout
CREATE TABLE IF NOT EXISTS public.rollout_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edital_id UUID REFERENCES public.editais(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'enable', 'disable', 'rollback'
  previous_value BOOLEAN,
  new_value BOOLEAN,
  authorized_by UUID REFERENCES auth.users(id),
  reason TEXT,
  environment TEXT DEFAULT 'production', -- 'staging', 'canary', 'production'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.rollout_audit IS 
  'Auditoria de ativação/desativação do fluxo programático por edital';

-- RLS para rollout_audit
ALTER TABLE public.rollout_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver audit de rollout"
  ON public.rollout_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

CREATE POLICY "Sistema pode inserir audit de rollout"
  ON public.rollout_audit
  FOR INSERT
  WITH CHECK (true);

-- Função para habilitar fluxo programático com auditoria
CREATE OR REPLACE FUNCTION public.enable_programmatic_flow(
  p_edital_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_value BOOLEAN;
  v_edital_numero TEXT;
  v_inscricoes_pendentes INTEGER;
BEGIN
  -- Verificar permissão (somente gestores)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('gestor', 'admin')
  ) THEN
    RAISE EXCEPTION 'Não autorizado. Somente gestores podem alterar feature toggle.';
  END IF;
  
  -- Buscar edital e verificar se existe
  SELECT use_programmatic_flow, numero_edital
  INTO v_previous_value, v_edital_numero
  FROM public.editais
  WHERE id = p_edital_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Edital não encontrado: %', p_edital_id;
  END IF;
  
  -- Verificar se já está habilitado
  IF v_previous_value = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Fluxo programático já está habilitado para este edital',
      'edital_id', p_edital_id,
      'edital_numero', v_edital_numero
    );
  END IF;
  
  -- Contar inscrições pendentes
  SELECT COUNT(*)
  INTO v_inscricoes_pendentes
  FROM public.inscricoes_edital
  WHERE edital_id = p_edital_id
    AND status IN ('aguardando_analise', 'em_analise', 'pendente_workflow');
  
  -- Habilitar fluxo programático
  UPDATE public.editais
  SET 
    use_programmatic_flow = true,
    updated_at = NOW()
  WHERE id = p_edital_id;
  
  -- Registrar auditoria
  INSERT INTO public.rollout_audit (
    edital_id,
    action,
    previous_value,
    new_value,
    authorized_by,
    reason,
    metadata
  )
  VALUES (
    p_edital_id,
    'enable',
    v_previous_value,
    true,
    auth.uid(),
    p_reason,
    jsonb_build_object(
      'edital_numero', v_edital_numero,
      'inscricoes_pendentes', v_inscricoes_pendentes,
      'timestamp', NOW()
    )
  );
  
  RAISE NOTICE '[ROLLOUT] Fluxo programático habilitado para edital %', v_edital_numero;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Fluxo programático habilitado para edital %s', v_edital_numero),
    'edital_id', p_edital_id,
    'edital_numero', v_edital_numero,
    'inscricoes_pendentes', v_inscricoes_pendentes,
    'previous_value', v_previous_value,
    'new_value', true
  );
END;
$$;

-- Função para desabilitar fluxo programático (rollback)
CREATE OR REPLACE FUNCTION public.disable_programmatic_flow(
  p_edital_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_value BOOLEAN;
  v_edital_numero TEXT;
  v_inscricoes_afetadas INTEGER;
BEGIN
  -- Verificar permissão
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('gestor', 'admin')
  ) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  
  -- Buscar edital
  SELECT use_programmatic_flow, numero_edital
  INTO v_previous_value, v_edital_numero
  FROM public.editais
  WHERE id = p_edital_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Edital não encontrado: %', p_edital_id;
  END IF;
  
  -- Contar inscrições afetadas
  SELECT COUNT(*)
  INTO v_inscricoes_afetadas
  FROM public.inscricoes_edital
  WHERE edital_id = p_edital_id
    AND status IN ('aguardando_analise', 'em_analise', 'pendente_workflow');
  
  -- Desabilitar fluxo programático
  UPDATE public.editais
  SET 
    use_programmatic_flow = false,
    updated_at = NOW()
  WHERE id = p_edital_id;
  
  -- Registrar auditoria
  INSERT INTO public.rollout_audit (
    edital_id,
    action,
    previous_value,
    new_value,
    authorized_by,
    reason,
    metadata
  )
  VALUES (
    p_edital_id,
    'disable',
    v_previous_value,
    false,
    auth.uid(),
    p_reason,
    jsonb_build_object(
      'edital_numero', v_edital_numero,
      'inscricoes_afetadas', v_inscricoes_afetadas,
      'timestamp', NOW()
    )
  );
  
  RAISE NOTICE '[ROLLOUT] Fluxo programático desabilitado para edital %', v_edital_numero;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Fluxo programático desabilitado para edital %s', v_edital_numero),
    'edital_id', p_edital_id,
    'edital_numero', v_edital_numero,
    'inscricoes_afetadas', v_inscricoes_afetadas,
    'previous_value', v_previous_value,
    'new_value', false
  );
END;
$$;

-- View para monitorar rollout
CREATE OR REPLACE VIEW public.view_rollout_status AS
SELECT 
  e.id,
  e.numero_edital,
  e.titulo,
  e.status as edital_status,
  e.use_programmatic_flow,
  COUNT(DISTINCT ie.id) FILTER (WHERE ie.status = 'aguardando_analise') as inscricoes_aguardando,
  COUNT(DISTINCT ie.id) FILTER (WHERE ie.status = 'em_analise') as inscricoes_em_analise,
  COUNT(DISTINCT ie.id) FILTER (WHERE ie.status = 'aprovado') as inscricoes_aprovadas,
  COUNT(DISTINCT ie.id) FILTER (WHERE ie.status = 'inabilitado') as inscricoes_reprovadas,
  COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'assinado') as contratos_assinados,
  COUNT(DISTINCT cr.id) FILTER (WHERE cr.status = 'Ativo') as credenciados_ativos,
  MAX(ra.created_at) as ultima_alteracao_toggle,
  MAX(ra.action) as ultima_acao_toggle
FROM public.editais e
LEFT JOIN public.inscricoes_edital ie ON ie.edital_id = e.id
LEFT JOIN public.contratos c ON c.inscricao_id = ie.id
LEFT JOIN public.credenciados cr ON cr.inscricao_id = ie.id
LEFT JOIN public.rollout_audit ra ON ra.edital_id = e.id
GROUP BY e.id, e.numero_edital, e.titulo, e.status, e.use_programmatic_flow;

COMMENT ON VIEW public.view_rollout_status IS 
  'Monitoramento de rollout do fluxo programático por edital';

-- Criar snapshot de estado antes do rollout
CREATE TABLE IF NOT EXISTS public.rollout_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type TEXT NOT NULL, -- 'pre_rollout', 'canary_checkpoint', 'post_rollout'
  environment TEXT NOT NULL, -- 'staging', 'canary', 'production'
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

COMMENT ON TABLE public.rollout_snapshots IS 
  'Snapshots de dados para rollback seguro';

ALTER TABLE public.rollout_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar snapshots"
  ON public.rollout_snapshots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('gestor', 'admin')
    )
  );

-- Função para criar snapshot
CREATE OR REPLACE FUNCTION public.create_rollout_snapshot(
  p_snapshot_type TEXT,
  p_environment TEXT DEFAULT 'production',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_snapshot_id UUID;
  v_data JSONB;
BEGIN
  -- Coletar dados
  SELECT jsonb_build_object(
    'editais', (
      SELECT jsonb_agg(to_jsonb(e))
      FROM public.editais e
      WHERE e.use_programmatic_flow = true
    ),
    'inscricoes', (
      SELECT jsonb_agg(to_jsonb(ie))
      FROM public.inscricoes_edital ie
      WHERE ie.status IN ('aguardando_analise', 'em_analise', 'pendente_workflow')
    ),
    'contratos', (
      SELECT jsonb_agg(to_jsonb(c))
      FROM public.contratos c
      WHERE c.created_at > NOW() - INTERVAL '7 days'
    ),
    'credenciados', (
      SELECT jsonb_agg(to_jsonb(cr))
      FROM public.credenciados cr
      WHERE cr.created_at > NOW() - INTERVAL '7 days'
    ),
    'timestamp', NOW()
  ) INTO v_data;
  
  -- Inserir snapshot
  INSERT INTO public.rollout_snapshots (
    snapshot_type,
    environment,
    data,
    created_by,
    notes
  )
  VALUES (
    p_snapshot_type,
    p_environment,
    v_data,
    auth.uid(),
    p_notes
  )
  RETURNING id INTO v_snapshot_id;
  
  RAISE NOTICE '[SNAPSHOT] Snapshot criado: %', v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;