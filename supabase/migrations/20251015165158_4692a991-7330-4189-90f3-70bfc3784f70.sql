-- FASE 2: Criar trigger para registrar datas em mudanças de status
CREATE OR REPLACE FUNCTION public.registrar_datas_credenciamento()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou para 'Ativo' e não tinha data de habilitação
  IF NEW.status = 'Ativo' AND (OLD.status IS NULL OR OLD.status != 'Ativo') THEN
    IF NEW.data_habilitacao IS NULL THEN
      NEW.data_habilitacao := NOW();
    END IF;
    
    -- Se não tem data de início, usar data de habilitação
    IF NEW.data_inicio_atendimento IS NULL THEN
      NEW.data_inicio_atendimento := CURRENT_DATE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_registrar_datas_credenciamento ON public.credenciados;

CREATE TRIGGER trg_registrar_datas_credenciamento
  BEFORE UPDATE ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_datas_credenciamento();