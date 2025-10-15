-- [REQ-18] FASE 1: Trigger Automático - Criar prazo ao aprovar documento
-- Cria automaticamente entrada em prazos_credenciamento quando documento é aprovado

CREATE OR REPLACE FUNCTION public.trigger_criar_prazo_documento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credenciado_id UUID;
  v_data_validade DATE;
  v_tipo_prazo TEXT;
BEGIN
  -- Só processa se status mudou para 'validado' ou 'aprovado'
  IF NEW.status IN ('validado', 'aprovado') AND (OLD.status IS NULL OR OLD.status NOT IN ('validado', 'aprovado')) THEN
    
    -- Extrair data de validade do OCR
    IF NEW.ocr_resultado IS NOT NULL AND NEW.ocr_resultado->>'dataValidade' IS NOT NULL THEN
      BEGIN
        v_data_validade := (NEW.ocr_resultado->>'dataValidade')::DATE;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '[PRAZO_AUTO] Erro ao converter dataValidade: %', NEW.ocr_resultado->>'dataValidade';
        RETURN NEW;
      END;
      
      -- Buscar credenciado_id via inscricao
      SELECT c.id INTO v_credenciado_id
      FROM public.credenciados c
      WHERE c.inscricao_id = NEW.inscricao_id;
      
      IF v_credenciado_id IS NULL THEN
        RAISE NOTICE '[PRAZO_AUTO] Credenciado não encontrado para inscrição %', NEW.inscricao_id;
        RETURN NEW;
      END IF;
      
      -- Mapear tipo_documento → tipo_prazo
      v_tipo_prazo := CASE 
        WHEN NEW.tipo_documento ILIKE '%cnh%' OR NEW.tipo_documento ILIKE '%carteira%habilitação%' THEN 'CNH'
        WHEN NEW.tipo_documento ILIKE '%crm%' THEN 'CRM'
        WHEN NEW.tipo_documento ILIKE '%cnpj%' OR NEW.tipo_documento ILIKE '%contrato social%' THEN 'CNPJ'
        WHEN NEW.tipo_documento ILIKE '%certificado%' THEN 'Certificado'
        WHEN NEW.tipo_documento ILIKE '%alvará%' THEN 'Alvará'
        ELSE 'Documento Geral'
      END;
      
      -- Inserir prazo (ON CONFLICT para evitar duplicatas)
      INSERT INTO public.prazos_credenciamento (
        credenciado_id,
        tipo_prazo,
        data_vencimento,
        status,
        origem_documento_id
      )
      VALUES (
        v_credenciado_id,
        v_tipo_prazo,
        v_data_validade,
        'ativo',
        NEW.id
      )
      ON CONFLICT (credenciado_id, tipo_prazo, data_vencimento) DO NOTHING;
      
      RAISE NOTICE '[PRAZO_AUTO] Prazo % criado para credenciado % (vencimento: %)', 
        v_tipo_prazo, v_credenciado_id, v_data_validade;
    ELSE
      RAISE NOTICE '[PRAZO_AUTO] Documento % aprovado sem dataValidade no OCR', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_criar_prazo_documento ON public.inscricao_documentos;
CREATE TRIGGER trigger_criar_prazo_documento
  AFTER INSERT OR UPDATE ON public.inscricao_documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_criar_prazo_documento();

COMMENT ON FUNCTION public.trigger_criar_prazo_documento IS 
  '[REQ-18] Cria automaticamente prazo em prazos_credenciamento ao aprovar documento com dataValidade';

-- Adicionar coluna origem_documento_id em prazos_credenciamento (se não existir)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'prazos_credenciamento' 
      AND column_name = 'origem_documento_id'
  ) THEN
    ALTER TABLE public.prazos_credenciamento 
    ADD COLUMN origem_documento_id UUID REFERENCES public.inscricao_documentos(id) ON DELETE SET NULL;
    
    COMMENT ON COLUMN public.prazos_credenciamento.origem_documento_id IS 
      'Referência ao documento que originou este prazo automaticamente';
  END IF;
END $$;