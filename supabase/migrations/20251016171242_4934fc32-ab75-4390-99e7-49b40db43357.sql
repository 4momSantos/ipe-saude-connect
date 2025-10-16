-- FASE 1: Adicionar campos para avaliação de profissionais específicos

-- 1.1. Adicionar colunas na tabela avaliacoes_publicas
ALTER TABLE public.avaliacoes_publicas
ADD COLUMN IF NOT EXISTS profissional_id UUID REFERENCES public.profissionais_credenciados(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS nota_profissional INTEGER CHECK (nota_profissional >= 1 AND nota_profissional <= 5),
ADD COLUMN IF NOT EXISTS comentario_profissional TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.avaliacoes_publicas.profissional_id IS 'ID do profissional específico avaliado (opcional)';
COMMENT ON COLUMN public.avaliacoes_publicas.nota_profissional IS 'Nota de 1-5 estrelas para o profissional específico';
COMMENT ON COLUMN public.avaliacoes_publicas.comentario_profissional IS 'Comentário específico sobre o profissional';
COMMENT ON COLUMN public.avaliacoes_publicas.nota_estrelas IS 'Nota de 1-5 estrelas para o ESTABELECIMENTO/CREDENCIADO';
COMMENT ON COLUMN public.avaliacoes_publicas.comentario IS 'Comentário sobre o ESTABELECIMENTO/CREDENCIADO';

-- 1.2. Criar view para estatísticas por profissional
CREATE OR REPLACE VIEW public.estatisticas_profissionais AS
SELECT 
  p.id AS profissional_id,
  p.credenciado_id,
  p.nome AS profissional_nome,
  p.especialidade,
  COUNT(ap.id) AS total_avaliacoes,
  ROUND(AVG(ap.nota_profissional), 2) AS nota_media,
  COUNT(ap.id) FILTER (WHERE ap.nota_profissional = 5) AS total_5_estrelas,
  COUNT(ap.id) FILTER (WHERE ap.nota_profissional = 4) AS total_4_estrelas,
  COUNT(ap.id) FILTER (WHERE ap.nota_profissional = 3) AS total_3_estrelas,
  COUNT(ap.id) FILTER (WHERE ap.nota_profissional = 2) AS total_2_estrelas,
  COUNT(ap.id) FILTER (WHERE ap.nota_profissional = 1) AS total_1_estrela,
  MAX(ap.created_at) AS ultima_avaliacao
FROM public.profissionais_credenciados p
LEFT JOIN public.avaliacoes_publicas ap ON ap.profissional_id = p.id AND ap.status = 'aprovada'
WHERE p.ativo = true
GROUP BY p.id, p.credenciado_id, p.nome, p.especialidade;