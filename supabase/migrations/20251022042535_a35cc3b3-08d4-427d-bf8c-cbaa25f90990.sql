-- Corrigir tipos de retorno para corresponder às colunas reais
DROP FUNCTION IF EXISTS public.get_credenciados_sem_crms(TEXT);

CREATE OR REPLACE FUNCTION public.get_credenciados_sem_crms(tipo_cred TEXT)
RETURNS TABLE (
  id UUID,
  nome TEXT,
  cpf TEXT,
  tipo_credenciamento VARCHAR(2),
  status VARCHAR(50),
  dados_inscricao JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (c.id)
    c.id,
    c.nome,
    c.cpf,
    c.tipo_credenciamento,
    c.status,
    ie.dados_inscricao
  FROM credenciados c
  INNER JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
  LEFT JOIN credenciado_crms crm ON crm.credenciado_id = c.id
  WHERE c.tipo_credenciamento = tipo_cred
    AND crm.id IS NULL;
END;
$$;