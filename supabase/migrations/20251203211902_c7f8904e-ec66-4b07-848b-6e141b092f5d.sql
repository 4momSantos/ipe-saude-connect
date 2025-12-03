-- Função RPC para buscar credenciados com CRMs e serviços consolidados (evita N+1 queries)
CREATE OR REPLACE FUNCTION get_credenciados_completo()
RETURNS TABLE (
  id UUID,
  inscricao_id UUID,
  nome TEXT,
  numero_credenciado TEXT,
  cpf TEXT,
  cnpj TEXT,
  rg TEXT,
  data_nascimento DATE,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  porte TEXT,
  status TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ,
  crms JSONB,
  servicos JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.inscricao_id,
    c.nome,
    c.numero_credenciado,
    c.cpf,
    c.cnpj,
    c.rg,
    c.data_nascimento,
    c.email,
    c.telefone,
    c.celular,
    c.endereco,
    c.cidade,
    c.estado,
    c.cep,
    c.porte,
    c.status,
    c.observacoes,
    c.created_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'crm', crm.crm, 
        'especialidade', crm.especialidade, 
        'uf_crm', crm.uf_crm
      ))
       FROM credenciado_crms crm WHERE crm.credenciado_id = c.id), '[]'::jsonb
    ) as crms,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'procedimento_id', cs.procedimento_id, 
        'procedimento_nome', p.nome, 
        'categoria', p.categoria, 
        'tipo', p.tipo
      ))
       FROM credenciado_servicos cs
       LEFT JOIN procedimentos p ON p.id = cs.procedimento_id
       WHERE cs.credenciado_id = c.id AND cs.disponivel = true), '[]'::jsonb
    ) as servicos
  FROM credenciados c
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;