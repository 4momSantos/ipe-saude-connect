-- Criar tabela para afastamentos
CREATE TABLE IF NOT EXISTS public.afastamentos_credenciados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credenciado_id UUID NOT NULL REFERENCES public.credenciados(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('licenca', 'ferias', 'afastamento')),
  data_inicio DATE NOT NULL,
  data_fim DATE,
  motivo TEXT,
  justificativa TEXT NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  analisado_por UUID REFERENCES auth.users(id),
  analisado_em TIMESTAMPTZ,
  observacoes_analise TEXT,
  documentos_anexos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id)
);

-- Expandir tabela de solicitações
ALTER TABLE public.solicitacoes_alteracao 
ADD COLUMN IF NOT EXISTS categoria TEXT,
ADD COLUMN IF NOT EXISTS prioridade TEXT DEFAULT 'normal' CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
ADD COLUMN IF NOT EXISTS documentos_anexos JSONB DEFAULT '[]'::jsonb;

-- RLS para afastamentos_credenciados
ALTER TABLE public.afastamentos_credenciados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Credenciados gerenciam seus afastamentos"
ON public.afastamentos_credenciados
FOR ALL
USING (
  credenciado_id IN (
    SELECT c.id FROM public.credenciados c
    JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE ie.candidato_id = auth.uid()
  )
);

CREATE POLICY "Gestores veem todos afastamentos"
ON public.afastamentos_credenciados
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'analista'::app_role)
);

CREATE POLICY "Gestores aprovam afastamentos"
ON public.afastamentos_credenciados
FOR UPDATE
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS para documentos_credenciados (visualização)
CREATE POLICY "Credenciados veem seus documentos"
ON public.documentos_credenciados
FOR SELECT
USING (
  credenciado_id IN (
    SELECT c.id FROM public.credenciados c
    JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE ie.candidato_id = auth.uid()
  )
  OR
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'analista'::app_role)
);

-- Trigger para notificar analistas sobre novas solicitações
CREATE OR REPLACE FUNCTION notify_new_solicitacao()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_notifications (
    user_id,
    type,
    title,
    message,
    related_type,
    related_id
  )
  SELECT 
    ur.user_id,
    'info',
    'Nova Solicitação de Alteração',
    'Uma nova solicitação foi criada por ' || (SELECT nome FROM public.credenciados WHERE id = NEW.credenciado_id),
    'solicitacao',
    NEW.id
  FROM public.user_roles ur
  WHERE ur.role IN ('analista', 'gestor', 'admin');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_new_solicitacao
  AFTER INSERT ON public.solicitacoes_alteracao
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_solicitacao();

-- Trigger para aplicar alterações aprovadas
CREATE OR REPLACE FUNCTION aplicar_alteracao_aprovada()
RETURNS TRIGGER AS $$
DECLARE
  v_dados JSONB;
BEGIN
  IF NEW.status = 'Aprovado' AND (OLD.status IS NULL OR OLD.status != 'Aprovado') THEN
    v_dados := NEW.dados_propostos;
    
    -- Aplicar alterações baseado no tipo
    IF NEW.tipo_alteracao ILIKE '%endereço%' OR NEW.tipo_alteracao ILIKE '%endereco%' THEN
      UPDATE public.credenciados 
      SET 
        endereco = COALESCE(v_dados->>'endereco', endereco),
        cidade = COALESCE(v_dados->>'cidade', cidade),
        estado = COALESCE(v_dados->>'estado', estado),
        cep = COALESCE(v_dados->>'cep', cep),
        updated_at = NOW()
      WHERE id = NEW.credenciado_id;
      
    ELSIF NEW.tipo_alteracao ILIKE '%telefone%' OR NEW.tipo_alteracao ILIKE '%contato%' THEN
      UPDATE public.credenciados 
      SET 
        telefone = COALESCE(v_dados->>'telefone', telefone),
        celular = COALESCE(v_dados->>'celular', celular),
        email = COALESCE(v_dados->>'email', email),
        updated_at = NOW()
      WHERE id = NEW.credenciado_id;
      
    ELSIF NEW.tipo_alteracao ILIKE '%dados%' THEN
      UPDATE public.credenciados 
      SET 
        nome = COALESCE(v_dados->>'nome', nome),
        cpf = COALESCE(v_dados->>'cpf', cpf),
        cnpj = COALESCE(v_dados->>'cnpj', cnpj),
        updated_at = NOW()
      WHERE id = NEW.credenciado_id;
    END IF;
    
    -- Notificar credenciado
    INSERT INTO public.app_notifications (
      user_id,
      type,
      title,
      message,
      related_type,
      related_id
    )
    SELECT 
      ie.candidato_id,
      'success',
      'Solicitação Aprovada',
      'Sua solicitação de alteração foi aprovada e os dados foram atualizados.',
      'solicitacao',
      NEW.id
    FROM public.credenciados c
    JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE c.id = NEW.credenciado_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_solicitacao_aprovada
  AFTER UPDATE ON public.solicitacoes_alteracao
  FOR EACH ROW
  EXECUTE FUNCTION aplicar_alteracao_aprovada();