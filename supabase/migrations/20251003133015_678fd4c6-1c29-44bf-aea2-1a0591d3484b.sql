-- Tabela de editais
CREATE TABLE IF NOT EXISTS public.editais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  titulo text NOT NULL,
  descricao text,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  vagas integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberto',
  especialidade text,
  created_by uuid REFERENCES auth.users(id)
);

-- Tabela de inscrições em editais
CREATE TABLE IF NOT EXISTS public.inscricoes_edital (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  edital_id uuid NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  candidato_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'em_analise',
  dados_inscricao jsonb,
  motivo_rejeicao text,
  analisado_por uuid REFERENCES auth.users(id),
  analisado_em timestamp with time zone,
  UNIQUE(edital_id, candidato_id)
);

-- Enable RLS
ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscricoes_edital ENABLE ROW LEVEL SECURITY;

-- RLS Policies para editais
CREATE POLICY "Todos podem ver editais ativos"
ON public.editais
FOR SELECT
USING (true);

CREATE POLICY "Gestores e admins podem gerenciar editais"
ON public.editais
FOR ALL
USING (has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'));

-- RLS Policies para inscrições
CREATE POLICY "Candidatos podem ver suas próprias inscrições"
ON public.inscricoes_edital
FOR SELECT
USING (auth.uid() = candidato_id);

CREATE POLICY "Candidatos podem criar inscrições"
ON public.inscricoes_edital
FOR INSERT
WITH CHECK (auth.uid() = candidato_id);

CREATE POLICY "Analistas e admins podem ver todas inscrições"
ON public.inscricoes_edital
FOR SELECT
USING (has_role(auth.uid(), 'analista') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

CREATE POLICY "Analistas e admins podem atualizar inscrições"
ON public.inscricoes_edital
FOR UPDATE
USING (has_role(auth.uid(), 'analista') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gestor'));

-- Trigger para updated_at
CREATE TRIGGER update_editais_updated_at
BEFORE UPDATE ON public.editais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inscricoes_edital_updated_at
BEFORE UPDATE ON public.inscricoes_edital
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_inscricoes_candidato ON public.inscricoes_edital(candidato_id);
CREATE INDEX idx_inscricoes_edital ON public.inscricoes_edital(edital_id);
CREATE INDEX idx_inscricoes_status ON public.inscricoes_edital(status);
CREATE INDEX idx_editais_status ON public.editais(status);