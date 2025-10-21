-- Remover trigger de validação de status que causa race condition
DROP TRIGGER IF EXISTS trg_validate_status_change ON inscricoes_edital;

-- Remover função de validação associada
DROP FUNCTION IF EXISTS validate_inscricao_status_change();

-- Comentário: A validação de análise prévia já é garantida pela edge function
-- processar-decisao, que exige analise_id válido antes de aprovar.
-- Manter validação duplicada no trigger causava race condition devido ao
-- isolamento transacional do PostgreSQL impedindo o trigger de ver o UPDATE
-- da análise dentro da mesma transação.