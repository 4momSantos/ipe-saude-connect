-- Tabela de credenciados
CREATE TABLE IF NOT EXISTS public.credenciados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT UNIQUE,
  cnpj TEXT,
  rg TEXT,
  data_nascimento DATE,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  porte TEXT CHECK (porte IN ('Pequeno', 'Médio', 'Grande')),
  status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Suspenso', 'Descredenciado')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de CRMs vinculados aos credenciados
CREATE TABLE IF NOT EXISTS public.credenciado_crms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID REFERENCES public.credenciados(id) ON DELETE CASCADE NOT NULL,
  crm TEXT NOT NULL,
  uf_crm TEXT NOT NULL,
  especialidade TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(credenciado_id, crm, uf_crm)
);

-- Tabela de horários de atendimento por especialidade
CREATE TABLE IF NOT EXISTS public.horarios_atendimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_crm_id UUID REFERENCES public.credenciado_crms(id) ON DELETE CASCADE NOT NULL,
  dia_semana TEXT NOT NULL CHECK (dia_semana IN ('Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo')),
  horario_inicio TIME NOT NULL,
  horario_fim TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de ocorrências
CREATE TABLE IF NOT EXISTS public.credenciado_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID REFERENCES public.credenciados(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Sanção', 'Auditoria', 'Notificação', 'Alteração de Status', 'Outro')),
  descricao TEXT NOT NULL,
  data_ocorrencia TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  usuario_responsavel TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de solicitações de alteração cadastral
CREATE TABLE IF NOT EXISTS public.solicitacoes_alteracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID REFERENCES public.credenciados(id) ON DELETE CASCADE NOT NULL,
  tipo_alteracao TEXT NOT NULL,
  dados_atuais JSONB,
  dados_propostos JSONB NOT NULL,
  justificativa TEXT,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Aprovada', 'Rejeitada')),
  solicitado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analisado_em TIMESTAMP WITH TIME ZONE,
  analisado_por TEXT,
  observacoes_analise TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.credenciados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credenciado_crms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horarios_atendimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credenciado_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_alteracao ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permitir leitura para usuários autenticados)
CREATE POLICY "Authenticated users can view credenciados"
  ON public.credenciados FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view CRMs"
  ON public.credenciado_crms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view horarios"
  ON public.horarios_atendimento FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view historico"
  ON public.credenciado_historico FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view solicitacoes"
  ON public.solicitacoes_alteracao FOR SELECT
  TO authenticated
  USING (true);

-- Policies para INSERT/UPDATE/DELETE (para admin ou gestores)
CREATE POLICY "Authenticated users can insert credenciados"
  ON public.credenciados FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update credenciados"
  ON public.credenciados FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert CRMs"
  ON public.credenciado_crms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update CRMs"
  ON public.credenciado_crms FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert horarios"
  ON public.horarios_atendimento FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update horarios"
  ON public.horarios_atendimento FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete horarios"
  ON public.horarios_atendimento FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert historico"
  ON public.credenciado_historico FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert solicitacoes"
  ON public.solicitacoes_alteracao FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update solicitacoes"
  ON public.solicitacoes_alteracao FOR UPDATE
  TO authenticated
  USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credenciados_updated_at
  BEFORE UPDATE ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_credenciados_status ON public.credenciados(status);
CREATE INDEX idx_credenciados_cidade ON public.credenciados(cidade);
CREATE INDEX idx_credenciado_crms_credenciado ON public.credenciado_crms(credenciado_id);
CREATE INDEX idx_credenciado_crms_especialidade ON public.credenciado_crms(especialidade);
CREATE INDEX idx_historico_credenciado ON public.credenciado_historico(credenciado_id);
CREATE INDEX idx_solicitacoes_credenciado ON public.solicitacoes_alteracao(credenciado_id);
CREATE INDEX idx_solicitacoes_status ON public.solicitacoes_alteracao(status);