-- Criar bucket permanente para documentos de inscrição
INSERT INTO storage.buckets (id, name, public)
VALUES ('inscricao-documentos', 'inscricao-documentos', false);

-- Políticas para inscricao-documentos
CREATE POLICY "Candidatos podem fazer upload de seus documentos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inscricao-documentos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Candidatos podem ver seus documentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inscricao-documentos' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR 
   has_role(auth.uid(), 'analista') OR 
   has_role(auth.uid(), 'gestor') OR 
   has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Analistas podem ver todos documentos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'inscricao-documentos' AND 
  (has_role(auth.uid(), 'analista') OR has_role(auth.uid(), 'gestor') OR has_role(auth.uid(), 'admin'))
);

-- Criar tabela de documentos de inscrição
CREATE TABLE public.inscricao_documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inscricao_id UUID REFERENCES public.inscricoes_edital(id) ON DELETE CASCADE NOT NULL,
  tipo_documento TEXT NOT NULL,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  arquivo_tamanho INTEGER,
  ocr_processado BOOLEAN DEFAULT false,
  ocr_resultado JSONB,
  ocr_confidence NUMERIC,
  status TEXT DEFAULT 'pendente',
  observacoes TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  analisado_por UUID REFERENCES auth.users(id),
  analisado_em TIMESTAMPTZ,
  versao INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inscricao_documentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para inscricao_documentos
CREATE POLICY "Candidatos podem criar documentos de suas inscrições"
ON public.inscricao_documentos
FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.inscricoes_edital
    WHERE id = inscricao_id AND candidato_id = auth.uid()
  )
);

CREATE POLICY "Candidatos podem ver documentos de suas inscrições"
ON public.inscricao_documentos
FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid() OR
  has_role(auth.uid(), 'analista') OR
  has_role(auth.uid(), 'gestor') OR
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Analistas podem atualizar documentos"
ON public.inscricao_documentos
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'analista') OR
  has_role(auth.uid(), 'gestor') OR
  has_role(auth.uid(), 'admin')
);

-- Trigger para updated_at
CREATE TRIGGER update_inscricao_documentos_updated_at
BEFORE UPDATE ON public.inscricao_documentos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_inscricao_documentos_inscricao_id ON public.inscricao_documentos(inscricao_id);
CREATE INDEX idx_inscricao_documentos_status ON public.inscricao_documentos(status);
CREATE INDEX idx_inscricao_documentos_uploaded_by ON public.inscricao_documentos(uploaded_by);