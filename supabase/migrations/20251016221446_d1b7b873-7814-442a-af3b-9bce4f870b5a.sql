-- ============================================
-- CORREÇÃO COMPLETA: Trigger + Bucket + RLS
-- ============================================

-- 1. Criar função de trigger para contratos
CREATE OR REPLACE FUNCTION public.ensure_contrato_on_aprovacao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contrato_id UUID;
  v_numero_contrato TEXT;
BEGIN
  -- Só executa se status mudou para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD IS NULL OR OLD.status != 'aprovado') THEN
    
    -- Verificar se já existe contrato
    SELECT id INTO v_contrato_id
    FROM public.contratos
    WHERE inscricao_id = NEW.inscricao_id;
    
    IF v_contrato_id IS NULL THEN
      -- Gerar número de contrato único
      v_numero_contrato := 'CONT-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                           LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
      
      -- Criar contrato
      INSERT INTO public.contratos (
        inscricao_id,
        analise_id,
        numero_contrato,
        status,
        tipo,
        dados_contrato
      ) VALUES (
        NEW.inscricao_id,
        NEW.id,
        v_numero_contrato,
        'pendente_assinatura',
        'credenciamento',
        jsonb_build_object(
          'tipo', 'credenciamento', 
          'data_geracao', NOW(),
          'gerado_via', 'trigger_aprovacao',
          'analise_id', NEW.id
        )
      );
      
      RAISE NOTICE '[TRIGGER_CONTRATO] Contrato % criado para análise %', v_numero_contrato, NEW.id;
    ELSE
      RAISE NOTICE '[TRIGGER_CONTRATO] Contrato já existe para inscrição %', NEW.inscricao_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Recriar trigger na tabela analises
DROP TRIGGER IF EXISTS trigger_ensure_contrato_on_aprovacao ON public.analises;
CREATE TRIGGER trigger_ensure_contrato_on_aprovacao
  AFTER INSERT OR UPDATE ON public.analises
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_contrato_on_aprovacao();

-- 3. Criar bucket 'contratos' no storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contratos', 
  'contratos', 
  false,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Política: Service role pode fazer upload de contratos
DROP POLICY IF EXISTS "Service role pode fazer upload de contratos" ON storage.objects;
CREATE POLICY "Service role pode fazer upload de contratos"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'contratos');

-- 5. Política: Service role pode atualizar contratos
DROP POLICY IF EXISTS "Service role pode atualizar contratos" ON storage.objects;
CREATE POLICY "Service role pode atualizar contratos"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'contratos');

-- 6. Política: Usuários podem baixar seus contratos
DROP POLICY IF EXISTS "Usuários podem baixar seus contratos" ON storage.objects;
CREATE POLICY "Usuários podem baixar seus contratos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'contratos' AND
  (
    -- Gestores e analistas podem ver todos
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
        AND role IN ('gestor', 'admin', 'analista')
    )
    OR
    -- Candidatos podem ver seus próprios contratos
    EXISTS (
      SELECT 1 
      FROM public.contratos c
      JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
      WHERE c.documento_url = name
        AND ie.candidato_id = auth.uid()
    )
  )
);