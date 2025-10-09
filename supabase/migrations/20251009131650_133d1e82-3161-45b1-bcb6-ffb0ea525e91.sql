-- FASE 1: Desacoplar do Workflow Engine

-- 1.1 Tornar workflow_id OPCIONAL
ALTER TABLE editais 
  ALTER COLUMN workflow_id DROP NOT NULL;

ALTER TABLE inscricoes_edital
  ALTER COLUMN workflow_execution_id DROP NOT NULL;

-- Desabilitar trigger fix_rascunho_on_workflow se existir
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'fix_rascunho_on_workflow') THEN
    ALTER TABLE inscricoes_edital DISABLE TRIGGER fix_rascunho_on_workflow;
  END IF;
END $$;

-- FASE 3: Ajustar Triggers de Banco

-- 3.1 Modificar create_analise_on_inscricao
DROP TRIGGER IF EXISTS create_analise_on_inscricao_trigger ON inscricoes_edital;

CREATE OR REPLACE FUNCTION public.create_analise_on_inscricao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Só cria análise se status mudou para aguardando_analise (fluxo programático)
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
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER create_analise_on_inscricao_trigger
  AFTER INSERT OR UPDATE ON inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION public.create_analise_on_inscricao();

-- FASE 4: Criar Seeds de Teste

-- Inserir edital de teste SEM workflow_id
INSERT INTO editais (
  titulo, 
  numero_edital, 
  objeto, 
  status, 
  workflow_id,
  data_inicio, 
  data_fim,
  descricao
)
VALUES (
  'Edital Teste - Fluxo Programático',
  'TESTE-FP-2025-001',
  'Credenciamento de médicos via fluxo programático direto (sem workflow engine)',
  'aberto',
  NULL,
  NOW(),
  NOW() + INTERVAL '30 days',
  'Este edital é utilizado para testar o fluxo programático de credenciamento sem dependência do workflow engine.'
)
ON CONFLICT DO NOTHING;

-- Inserir template de inscrição simplificado
INSERT INTO inscription_templates (
  name,
  description,
  campos_formulario,
  anexos_obrigatorios,
  is_active
)
VALUES (
  'Template Credenciamento Básico - Fluxo Programático',
  'Template simplificado para teste do fluxo programático',
  '[
    {"nome":"nome_completo","label":"Nome Completo","tipo":"text","obrigatorio":true},
    {"nome":"cpf","label":"CPF","tipo":"text","obrigatorio":true},
    {"nome":"email","label":"E-mail","tipo":"email","obrigatorio":true}
  ]'::jsonb,
  '[
    {"tipo":"RG","label":"RG (Frente e Verso)","obrigatorio":true},
    {"tipo":"CPF","label":"CPF","obrigatorio":true}
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;