-- FASE 5: Suspensão Automática
ALTER TABLE public.credenciados
ADD COLUMN IF NOT EXISTS data_descredenciamento_programado DATE,
ADD COLUMN IF NOT EXISTS motivo_descredenciamento TEXT,
ADD COLUMN IF NOT EXISTS suspensao_inicio DATE,
ADD COLUMN IF NOT EXISTS suspensao_fim DATE,
ADD COLUMN IF NOT EXISTS motivo_suspensao TEXT,
ADD COLUMN IF NOT EXISTS suspensao_automatica BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_credenciados_suspensao ON public.credenciados(suspensao_inicio, suspensao_fim) 
WHERE suspensao_inicio IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credenciados_descredenciamento ON public.credenciados(data_descredenciamento_programado) 
WHERE data_descredenciamento_programado IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.regras_suspensao_automatica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo_gatilho TEXT NOT NULL CHECK (tipo_gatilho IN ('ocorrencias', 'avaliacoes', 'vencimento_docs', 'sancoes_acumuladas')),
  condicao JSONB NOT NULL,
  acao TEXT NOT NULL DEFAULT 'suspensao' CHECK (acao IN ('suspensao', 'alerta', 'descredenciamento', 'notificacao')),
  duracao_dias INTEGER,
  notificar_gestores BOOLEAN DEFAULT true,
  notificar_credenciado BOOLEAN DEFAULT true,
  ativo BOOLEAN DEFAULT true,
  prioridade INTEGER DEFAULT 1,
  criada_por UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logs_regras_suspensao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id UUID REFERENCES public.regras_suspensao_automatica(id) ON DELETE CASCADE,
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  acao_aplicada TEXT NOT NULL,
  motivo TEXT NOT NULL,
  dados_gatilho JSONB,
  aplicado_em TIMESTAMPTZ DEFAULT now(),
  aplicado_por TEXT DEFAULT 'sistema'
);

CREATE INDEX IF NOT EXISTS idx_regras_suspensao_tipo ON public.regras_suspensao_automatica(tipo_gatilho);
CREATE INDEX IF NOT EXISTS idx_regras_suspensao_ativo ON public.regras_suspensao_automatica(ativo);
CREATE INDEX IF NOT EXISTS idx_logs_regras_credenciado ON public.logs_regras_suspensao(credenciado_id);
CREATE INDEX IF NOT EXISTS idx_logs_regras_data ON public.logs_regras_suspensao(aplicado_em);

ALTER TABLE public.regras_suspensao_automatica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_regras_suspensao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Gestores podem gerenciar regras"
ON public.regras_suspensao_automatica FOR ALL TO authenticated
USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestores podem ver logs"
ON public.logs_regras_suspensao FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

-- Função para verificar regras
CREATE OR REPLACE FUNCTION public.verificar_regras_suspensao_automatica()
RETURNS TABLE (
  credenciado_id UUID,
  credenciado_nome TEXT,
  regra_id UUID,
  regra_nome TEXT,
  acao TEXT,
  motivo TEXT,
  dados_gatilho JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regra RECORD;
  v_credenciado RECORD;
BEGIN
  FOR v_regra IN 
    SELECT * FROM regras_suspensao_automatica 
    WHERE ativo = true 
    ORDER BY prioridade DESC
  LOOP
    IF v_regra.tipo_gatilho = 'ocorrencias' THEN
      FOR v_credenciado IN
        SELECT 
          c.id,
          c.nome,
          COUNT(o.id) as total_ocorrencias
        FROM credenciados c
        JOIN ocorrencias_prestadores o ON o.credenciado_id = c.id
        WHERE c.status = 'Ativo'
          AND o.gravidade = (v_regra.condicao->>'gravidade')::TEXT
          AND o.data_ocorrencia >= CURRENT_DATE - (v_regra.condicao->>'periodo_dias')::INTEGER
        GROUP BY c.id, c.nome
        HAVING COUNT(o.id) >= (v_regra.condicao->>'quantidade')::INTEGER
      LOOP
        RETURN QUERY SELECT
          v_credenciado.id,
          v_credenciado.nome,
          v_regra.id,
          v_regra.nome,
          v_regra.acao,
          format('%s ocorrências de gravidade %s nos últimos %s dias', 
            v_credenciado.total_ocorrencias,
            v_regra.condicao->>'gravidade',
            v_regra.condicao->>'periodo_dias'
          ),
          jsonb_build_object('total_ocorrencias', v_credenciado.total_ocorrencias);
      END LOOP;
    ELSIF v_regra.tipo_gatilho = 'avaliacoes' THEN
      FOR v_credenciado IN
        SELECT 
          c.id,
          c.nome,
          COUNT(*) as avaliacoes_baixas
        FROM credenciados c
        JOIN avaliacoes_prestadores av ON av.credenciado_id = c.id
        WHERE c.status = 'Ativo'
          AND av.status = 'finalizada'
          AND av.pontuacao_geral < (v_regra.condicao->>'nota_minima')::NUMERIC
          AND av.periodo_referencia >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY c.id, c.nome
        HAVING COUNT(*) >= (v_regra.condicao->>'avaliacoes_consecutivas')::INTEGER
      LOOP
        RETURN QUERY SELECT
          v_credenciado.id,
          v_credenciado.nome,
          v_regra.id,
          v_regra.nome,
          v_regra.acao,
          format('%s avaliações abaixo de %.1f nos últimos 90 dias', 
            v_credenciado.avaliacoes_baixas,
            (v_regra.condicao->>'nota_minima')::NUMERIC
          ),
          jsonb_build_object('avaliacoes_baixas', v_credenciado.avaliacoes_baixas);
      END LOOP;
    END IF;
  END LOOP;
END;
$$;