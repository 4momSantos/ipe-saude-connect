-- Trigger para validar mudanças de status e prevenir aprovações sem análise
CREATE OR REPLACE FUNCTION validate_inscricao_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou para 'aprovado' mas não existe análise aprovada
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    IF NOT EXISTS (
      SELECT 1 FROM analises 
      WHERE inscricao_id = NEW.id 
      AND status = 'aprovado'
      AND analisado_em IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'Não é permitido aprovar inscrição sem análise registrada. Use a interface de aprovação ou a edge function processar-decisao.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trg_validate_status_change ON inscricoes_edital;
CREATE TRIGGER trg_validate_status_change
  BEFORE UPDATE OF status ON inscricoes_edital
  FOR EACH ROW
  EXECUTE FUNCTION validate_inscricao_status_change();

-- Criar análise retroativa para a inscrição do Arthur Santos
INSERT INTO analises (
  inscricao_id,
  analista_id,
  status,
  parecer,
  analisado_em
) 
SELECT 
  '150c03f2-8caa-4037-9143-eb5b15a19de0',
  analisado_por,
  'aprovado',
  'Aprovação retroativa para correção de fluxo - inscrição aprovada diretamente no banco sem passar pelo processo padrão',
  analisado_em
FROM inscricoes_edital
WHERE id = '150c03f2-8caa-4037-9143-eb5b15a19de0'
ON CONFLICT DO NOTHING;