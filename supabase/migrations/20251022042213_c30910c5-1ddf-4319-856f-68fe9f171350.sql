-- FASE 1: Criar função para buscar credenciados sem CRMs
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
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
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
    AND crm.id IS NULL
  GROUP BY c.id, c.nome, c.cpf, c.tipo_credenciamento, c.status, ie.dados_inscricao;
END;
$$;