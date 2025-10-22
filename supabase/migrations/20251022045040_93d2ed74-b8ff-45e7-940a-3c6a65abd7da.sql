-- FASE 1: Corrigir tipo_credenciamento NULL baseado em CPF/CNPJ
UPDATE credenciados
SET tipo_credenciamento = CASE
  WHEN cpf IS NOT NULL AND cnpj IS NULL THEN 'PF'
  WHEN cnpj IS NOT NULL THEN 'PJ'
  ELSE tipo_credenciamento
END
WHERE tipo_credenciamento IS NULL;

-- FASE 2: Atualizar get_credenciados_sem_crms para incluir tipo_credenciamento NULL
CREATE OR REPLACE FUNCTION public.get_credenciados_sem_crms(tipo_cred TEXT)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  cpf TEXT,
  tipo_credenciamento TEXT,
  status TEXT,
  dados_inscricao JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (c.id)
    c.id,
    c.nome,
    c.cpf,
    c.tipo_credenciamento::TEXT,
    c.status::TEXT,
    ie.dados_inscricao
  FROM credenciados c
  INNER JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
  LEFT JOIN credenciado_crms crm ON crm.credenciado_id = c.id
  WHERE (
    c.tipo_credenciamento = tipo_cred 
    OR (tipo_cred = 'PF' AND c.tipo_credenciamento IS NULL AND c.cpf IS NOT NULL)
  )
  AND crm.id IS NULL
  AND c.status = 'Ativo';
END;
$$;

-- FASE 4: Criar trigger preventivo para auto-preencher tipo_credenciamento
CREATE OR REPLACE FUNCTION public.auto_set_tipo_credenciamento()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo_credenciamento IS NULL THEN
    IF NEW.cpf IS NOT NULL AND NEW.cnpj IS NULL THEN
      NEW.tipo_credenciamento := 'PF';
      RAISE NOTICE '[AUTO_TIPO] Tipo credenciamento definido como PF para %', NEW.id;
    ELSIF NEW.cnpj IS NOT NULL THEN
      NEW.tipo_credenciamento := 'PJ';
      RAISE NOTICE '[AUTO_TIPO] Tipo credenciamento definido como PJ para %', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger BEFORE INSERT/UPDATE em credenciados
DROP TRIGGER IF EXISTS trigger_auto_set_tipo_credenciamento ON credenciados;
CREATE TRIGGER trigger_auto_set_tipo_credenciamento
  BEFORE INSERT OR UPDATE ON credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_tipo_credenciamento();