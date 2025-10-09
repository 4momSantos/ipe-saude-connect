-- Migration: Criar trigger para inscrições órfãs e adicionar análise automática (Corrigido)
-- Objetivo: Garantir que inscrições no fluxo programático criem análises automaticamente

-- 1. Criar função para processar inscrições órfãs no fluxo programático
CREATE OR REPLACE FUNCTION public.process_orphan_inscricoes_programaticas()
RETURNS TABLE(
  result_inscricao_id UUID,
  result_edital_id UUID,
  result_action TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Criar análises para inscrições existentes que estão sem análise
  -- mas o edital tem use_programmatic_flow = true
  INSERT INTO public.analises (inscricao_id, status, created_at)
  SELECT 
    ie.id,
    'pendente'::TEXT,
    NOW()
  FROM inscricoes_edital ie
  JOIN editais e ON e.id = ie.edital_id
  LEFT JOIN analises a ON a.inscricao_id = ie.id
  WHERE e.use_programmatic_flow = true
    AND ie.workflow_execution_id IS NULL
    AND ie.is_rascunho = false
    AND ie.status IN ('aguardando_analise', 'em_analise')
    AND a.id IS NULL
  ON CONFLICT (inscricao_id) DO NOTHING;
  
  -- Retornar inscrições processadas
  RETURN QUERY
  SELECT 
    ie.id AS result_inscricao_id,
    ie.edital_id AS result_edital_id,
    'Análise criada'::TEXT AS result_action
  FROM inscricoes_edital ie
  JOIN editais e ON e.id = ie.edital_id
  JOIN analises a ON a.inscricao_id = ie.id
  WHERE e.use_programmatic_flow = true
    AND ie.workflow_execution_id IS NULL
    AND a.created_at > NOW() - INTERVAL '1 minute';
END;
$$;

COMMENT ON FUNCTION public.process_orphan_inscricoes_programaticas() IS 
'Processa inscrições órfãs que usam fluxo programático, criando análises automaticamente';

-- 2. Atualizar trigger de criação de análise para considerar fluxo programático
DROP TRIGGER IF EXISTS trigger_create_analise_on_inscricao ON public.inscricoes_edital;

CREATE OR REPLACE FUNCTION public.create_analise_on_inscricao()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_edital_uses_programmatic BOOLEAN;
BEGIN
  -- Buscar se edital usa fluxo programático
  SELECT use_programmatic_flow INTO v_edital_uses_programmatic
  FROM public.editais
  WHERE id = NEW.edital_id;
  
  -- Só cria análise se usa fluxo programático
  IF v_edital_uses_programmatic = true THEN
    -- Cria análise para status aguardando_analise (fluxo programático)
    IF NEW.status = 'aguardando_analise' AND (OLD IS NULL OR OLD.status != 'aguardando_analise') THEN
      INSERT INTO public.analises (inscricao_id, status)
      VALUES (NEW.id, 'pendente')
      ON CONFLICT (inscricao_id) DO NOTHING;
      
      RAISE NOTICE '[FLUXO_PROGRAMATICO] Análise criada para inscrição %', NEW.id;
    -- Mantém compatibilidade com workflow engine (em_analise)
    ELSIF NEW.status = 'em_analise' AND (OLD IS NULL OR OLD.status != 'em_analise') THEN
      INSERT INTO public.analises (inscricao_id, status)
      VALUES (NEW.id, 'pendente')
      ON CONFLICT (inscricao_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_create_analise_on_inscricao
AFTER INSERT OR UPDATE ON public.inscricoes_edital
FOR EACH ROW
EXECUTE FUNCTION public.create_analise_on_inscricao();

COMMENT ON TRIGGER trigger_create_analise_on_inscricao ON public.inscricoes_edital IS
'Cria análise automaticamente apenas para editais com fluxo programático ativo';

-- 3. Executar função uma vez para processar inscrições existentes
SELECT * FROM public.process_orphan_inscricoes_programaticas();
