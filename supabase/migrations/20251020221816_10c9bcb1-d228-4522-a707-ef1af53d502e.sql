-- Corrigir função de validação do trigger para funcionar com transações atômicas
-- Remove verificação de analisado_em que causa falso positivo durante transações
CREATE OR REPLACE FUNCTION validate_inscricao_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou para 'aprovado' mas não existe análise aprovada
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    -- Verificar se a análise está sendo aprovada NA MESMA TRANSAÇÃO
    IF NOT EXISTS (
      SELECT 1 FROM analises 
      WHERE inscricao_id = NEW.id 
      AND status = 'aprovado'
      -- REMOVIDO: AND analisado_em IS NOT NULL
      -- Motivo: Causa falso positivo em transações atômicas
    ) THEN
      RAISE EXCEPTION 'Não é permitido aprovar inscrição sem análise registrada. Use a interface de aprovação ou a edge function processar-decisao.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;