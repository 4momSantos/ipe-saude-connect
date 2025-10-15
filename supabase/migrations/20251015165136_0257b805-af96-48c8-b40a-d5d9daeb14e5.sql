-- FASE 1: Adicionar colunas na tabela credenciados
ALTER TABLE public.credenciados 
ADD COLUMN IF NOT EXISTS data_solicitacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_habilitacao TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS data_inicio_atendimento DATE;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_credenciados_data_solicitacao 
  ON public.credenciados(data_solicitacao);
CREATE INDEX IF NOT EXISTS idx_credenciados_data_habilitacao 
  ON public.credenciados(data_habilitacao);
CREATE INDEX IF NOT EXISTS idx_credenciados_data_inicio 
  ON public.credenciados(data_inicio_atendimento);

-- Comentários para documentação
COMMENT ON COLUMN public.credenciados.data_solicitacao 
  IS 'Data em que o candidato submeteu a inscrição original';
COMMENT ON COLUMN public.credenciados.data_habilitacao 
  IS 'Data em que o status mudou para Ativo pela primeira vez';
COMMENT ON COLUMN public.credenciados.data_inicio_atendimento 
  IS 'Data em que o credenciado inicia/iniciou atendimentos';