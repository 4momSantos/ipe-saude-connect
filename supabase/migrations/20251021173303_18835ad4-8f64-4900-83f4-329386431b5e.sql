
-- Dropar a função incorreta criada anteriormente
DROP FUNCTION IF EXISTS public.sync_approved_inscricao_to_credenciado() CASCADE;

-- Alterar o trigger para usar a função v2 (correta)
DROP TRIGGER IF EXISTS trigger_sync_approved_inscricao_to_credenciado ON public.inscricoes_edital;

CREATE TRIGGER trigger_sync_approved_inscricao_to_credenciado
  AFTER INSERT OR UPDATE ON public.inscricoes_edital
  FOR EACH ROW
  WHEN (NEW.status = 'aprovado')
  EXECUTE FUNCTION sync_approved_inscricao_to_credenciado_v2();

-- Atualizar credenciados existentes com endereço faltando
UPDATE credenciados c
SET
  endereco = COALESCE(
    ie.dados_inscricao->'endereco_correspondencia'->>'logradouro',
    c.endereco
  ),
  cidade = COALESCE(
    ie.dados_inscricao->'endereco_correspondencia'->>'cidade',
    c.cidade
  ),
  estado = COALESCE(
    ie.dados_inscricao->'endereco_correspondencia'->>'uf',
    c.estado
  ),
  cep = COALESCE(
    ie.dados_inscricao->'endereco_correspondencia'->>'cep',
    c.cep
  ),
  updated_at = NOW()
FROM inscricoes_edital ie
WHERE ie.id = c.inscricao_id
  AND (c.endereco IS NULL OR c.endereco = 'S/N' OR c.cep IS NULL)
  AND ie.dados_inscricao->'endereco_correspondencia' IS NOT NULL;
