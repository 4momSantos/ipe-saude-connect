-- Criar tabela de especialidades médicas
CREATE TABLE public.especialidades_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  codigo TEXT UNIQUE,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at
CREATE TRIGGER update_especialidades_medicas_updated_at
BEFORE UPDATE ON public.especialidades_medicas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.especialidades_medicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver especialidades ativas"
ON public.especialidades_medicas FOR SELECT
TO authenticated
USING (ativa = true);

CREATE POLICY "Gestores podem gerenciar especialidades"
ON public.especialidades_medicas FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Criar tabela de relacionamento edital-especialidades
CREATE TABLE public.edital_especialidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edital_id UUID NOT NULL REFERENCES public.editais(id) ON DELETE CASCADE,
  especialidade_id UUID NOT NULL REFERENCES public.especialidades_medicas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(edital_id, especialidade_id)
);

-- RLS Policies
ALTER TABLE public.edital_especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver especialidades de editais"
ON public.edital_especialidades FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestores podem gerenciar especialidades de editais"
ON public.edital_especialidades FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'gestor'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Atualizar tabela credenciado_crms
ALTER TABLE public.credenciado_crms 
ADD COLUMN especialidade_id UUID REFERENCES public.especialidades_medicas(id);

CREATE INDEX idx_credenciado_crms_especialidade_id 
ON public.credenciado_crms(especialidade_id);

-- Popular com especialidades comuns
INSERT INTO public.especialidades_medicas (nome, codigo) VALUES
  ('Cardiologia', 'CARDIO'),
  ('Dermatologia', 'DERMATO'),
  ('Ginecologia e Obstetrícia', 'GINECO'),
  ('Pediatria', 'PEDIATRIA'),
  ('Ortopedia', 'ORTO'),
  ('Oftalmologia', 'OFTALMO'),
  ('Clínica Médica', 'CLINICA'),
  ('Psiquiatria', 'PSIQ'),
  ('Neurologia', 'NEURO'),
  ('Endocrinologia', 'ENDO'),
  ('Gastroenterologia', 'GASTRO'),
  ('Urologia', 'URO'),
  ('Otorrinolaringologia', 'ORL'),
  ('Anestesiologia', 'ANESTESIA'),
  ('Medicina do Trabalho', 'MED_TRABALHO'),
  ('Pneumologia', 'PNEUMO'),
  ('Reumatologia', 'REUMATO'),
  ('Nefrologia', 'NEFRO'),
  ('Oncologia', 'ONCO'),
  ('Hematologia', 'HEMATO');

-- Migrar dados existentes
INSERT INTO public.especialidades_medicas (nome)
SELECT DISTINCT especialidade 
FROM public.credenciado_crms 
WHERE especialidade IS NOT NULL
  AND especialidade NOT IN (SELECT nome FROM public.especialidades_medicas)
ON CONFLICT (nome) DO NOTHING;

-- Atualizar foreign keys
UPDATE public.credenciado_crms crm
SET especialidade_id = esp.id
FROM public.especialidades_medicas esp
WHERE crm.especialidade = esp.nome;