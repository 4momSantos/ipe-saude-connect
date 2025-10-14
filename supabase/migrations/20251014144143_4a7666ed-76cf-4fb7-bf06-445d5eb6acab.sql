-- ============================================
-- ITEM 5: HISTÓRICO DE STATUS
-- ============================================

-- Tabela de histórico de mudanças de status
CREATE TABLE IF NOT EXISTS public.historico_status_credenciado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  status_anterior TEXT NOT NULL,
  status_novo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  documentos_anexos JSONB DEFAULT '[]'::jsonb,
  alterado_por UUID REFERENCES auth.users(id),
  alterado_por_nome TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_status_credenciado ON public.historico_status_credenciado(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_historico_status_created ON public.historico_status_credenciado(created_at DESC);

-- RLS
ALTER TABLE public.historico_status_credenciado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem ver histórico de status"
  ON public.historico_status_credenciado
  FOR SELECT
  USING (has_role(auth.uid(), 'gestor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema pode inserir histórico de status"
  ON public.historico_status_credenciado
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Credenciados podem ver seu histórico"
  ON public.historico_status_credenciado
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = historico_status_credenciado.credenciado_id
      AND ie.candidato_id = auth.uid()
  ));

-- Trigger para registrar mudanças de status automaticamente
CREATE OR REPLACE FUNCTION public.registrar_mudanca_status_credenciado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_name TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Buscar nome do usuário
    SELECT nome INTO v_user_name
    FROM public.profiles
    WHERE id = auth.uid();
    
    INSERT INTO public.historico_status_credenciado (
      credenciado_id,
      status_anterior,
      status_novo,
      motivo,
      alterado_por,
      alterado_por_nome,
      metadata
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(NEW.motivo_suspensao, NEW.motivo_descredenciamento, 'Mudança de status'),
      auth.uid(),
      v_user_name,
      jsonb_build_object(
        'suspensao_inicio', NEW.suspensao_inicio,
        'suspensao_fim', NEW.suspensao_fim,
        'suspensao_automatica', NEW.suspensao_automatica
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_registrar_mudanca_status ON public.credenciados;
CREATE TRIGGER trigger_registrar_mudanca_status
  AFTER UPDATE ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_mudanca_status_credenciado();

COMMENT ON TABLE public.historico_status_credenciado IS 'Histórico completo de mudanças de status de credenciados';
COMMENT ON FUNCTION public.registrar_mudanca_status_credenciado IS 'Registra automaticamente mudanças de status de credenciados';