-- Atualizar datas dos credenciados com base no histórico de inscrições e contratos

-- 1. Preencher data_solicitacao com base na data de criação da inscrição
UPDATE credenciados c
SET data_solicitacao = ie.created_at
FROM inscricoes_edital ie
WHERE c.inscricao_id = ie.id
  AND c.data_solicitacao IS NULL;

-- 2. Preencher data_habilitacao com base na data de assinatura do contrato
UPDATE credenciados c
SET data_habilitacao = ct.assinado_em
FROM contratos ct
WHERE ct.inscricao_id = c.inscricao_id
  AND ct.status = 'assinado'
  AND c.data_habilitacao IS NULL
  AND ct.assinado_em IS NOT NULL;

-- 3. Preencher data_inicio_atendimento com base na data de assinatura do contrato (mesma data ou próxima)
UPDATE credenciados c
SET data_inicio_atendimento = COALESCE(ct.assinado_em::date, ct.created_at::date)
FROM contratos ct
WHERE ct.inscricao_id = c.inscricao_id
  AND ct.status = 'assinado'
  AND c.data_inicio_atendimento IS NULL;

-- 4. Para credenciados sem contrato assinado, usar a data de aprovação da análise
UPDATE credenciados c
SET data_habilitacao = a.analisado_em
FROM analises a
WHERE a.inscricao_id = c.inscricao_id
  AND a.status = 'aprovada'
  AND c.data_habilitacao IS NULL
  AND a.analisado_em IS NOT NULL;

-- Criar índices para melhorar performance de queries futuras
CREATE INDEX IF NOT EXISTS idx_credenciados_datas ON credenciados(data_solicitacao, data_habilitacao, data_inicio_atendimento);
CREATE INDEX IF NOT EXISTS idx_credenciados_inscricao_id ON credenciados(inscricao_id) WHERE inscricao_id IS NOT NULL;