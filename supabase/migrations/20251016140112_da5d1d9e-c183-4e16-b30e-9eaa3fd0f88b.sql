-- FASE 1: Adicionar rastreabilidade aos documentos de credenciados
ALTER TABLE public.documentos_credenciados
  ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'upload_manual',
  ADD COLUMN IF NOT EXISTS inscricao_id UUID REFERENCES inscricoes_edital(id),
  ADD COLUMN IF NOT EXISTS documento_origem_id UUID REFERENCES inscricao_documentos(id);

COMMENT ON COLUMN documentos_credenciados.origem IS 'Origem do documento: migrado | upload_manual | renovacao';
COMMENT ON COLUMN documentos_credenciados.inscricao_id IS 'Referência à inscrição original';
COMMENT ON COLUMN documentos_credenciados.documento_origem_id IS 'Referência ao documento original em inscricao_documentos';