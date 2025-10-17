-- ================================================
-- MIGRAÇÃO: Sistema de Geocodificação Completo
-- ================================================

-- 1. TRIGGER: Geocodificação Automática de Consultórios
-- ================================================

CREATE OR REPLACE FUNCTION public.geocodificar_consultorio_automatico()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url TEXT;
BEGIN
  -- Só geocodificar se consultório tem CEP mas não tem coordenadas
  IF NEW.cep IS NOT NULL AND NEW.latitude IS NULL THEN
    
    -- Obter URL do Supabase (compatível com triggers)
    v_supabase_url := current_setting('app.settings', true)::json->>'supabase_url';
    
    IF v_supabase_url IS NULL THEN
      v_supabase_url := 'https://ncmofeencqpqhtguxmvy.supabase.co';
    END IF;
    
    -- Chamar edge function assíncrona via pg_net
    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/geocodificar-credenciado',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings', true)::json->>'service_role_key'
      ),
      body := jsonb_build_object(
        'consultorio_id', NEW.id::text,
        'endereco_completo', CONCAT_WS(', ',
          NEW.logradouro,
          NEW.numero,
          NEW.bairro,
          NEW.cidade,
          NEW.estado,
          'Brasil'
        ),
        'cep', NEW.cep
      )
    );
    
    RAISE NOTICE '[GEOCODING] Consultório % enfileirado para geocodificação', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger se não existe
DROP TRIGGER IF EXISTS trigger_geocodificar_consultorio ON public.credenciado_consultorios;

CREATE TRIGGER trigger_geocodificar_consultorio
  AFTER INSERT ON public.credenciado_consultorios
  FOR EACH ROW
  EXECUTE FUNCTION public.geocodificar_consultorio_automatico();

-- ================================================
-- 2. TRIGGER: Geocodificação Condicional de Sede PJ
-- ================================================

CREATE OR REPLACE FUNCTION public.geocodificar_sede_pj_se_atende()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sede_atende BOOLEAN;
  v_supabase_url TEXT;
BEGIN
  -- Verificar se status mudou para Ativo e se sede atende pacientes
  IF NEW.status = 'Ativo' AND (OLD.status IS NULL OR OLD.status != 'Ativo') THEN
    
    -- Buscar dados da inscrição para verificar flag sede_atende
    SELECT 
      (ie.dados_inscricao->'pessoa_juridica'->>'sede_atende')::boolean
    INTO v_sede_atende
    FROM public.inscricoes_edital ie
    WHERE ie.id = NEW.inscricao_id;
    
    -- Se sede atende e não está geocodificado, geocodificar
    IF v_sede_atende = true AND NEW.latitude IS NULL AND NEW.endereco IS NOT NULL THEN
      
      v_supabase_url := current_setting('app.settings', true)::json->>'supabase_url';
      
      IF v_supabase_url IS NULL THEN
        v_supabase_url := 'https://ncmofeencqpqhtguxmvy.supabase.co';
      END IF;
      
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/geocodificar-credenciado',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings', true)::json->>'service_role_key'
        ),
        body := jsonb_build_object(
          'credenciado_id', NEW.id::text,
          'endereco_completo', CONCAT_WS(', ',
            NEW.endereco,
            NEW.cidade,
            NEW.estado,
            'Brasil'
          ),
          'cep', NEW.cep
        )
      );
      
      RAISE NOTICE '[GEOCODING] Sede PJ % (credenciado %) enfileirada para geocodificação', 
        NEW.nome, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger se não existe
DROP TRIGGER IF EXISTS trigger_geocodificar_sede_pj ON public.credenciados;

CREATE TRIGGER trigger_geocodificar_sede_pj
  AFTER INSERT OR UPDATE OF status ON public.credenciados
  FOR EACH ROW
  EXECUTE FUNCTION public.geocodificar_sede_pj_se_atende();

-- ================================================
-- 3. VIEW: Status de Geocodificação
-- ================================================

CREATE OR REPLACE VIEW public.geocoding_status AS
SELECT 
  'credenciado' AS tipo,
  c.id,
  c.nome,
  c.endereco,
  c.cidade,
  c.estado,
  c.cep,
  c.latitude,
  c.longitude,
  c.geocoded_at,
  c.status,
  CASE 
    WHEN c.latitude IS NOT NULL THEN 'geocodificado'
    WHEN c.endereco IS NULL THEN 'sem_endereco'
    ELSE 'pendente'
  END AS geocoding_status
FROM public.credenciados c
WHERE c.status = 'Ativo'

UNION ALL

SELECT 
  'consultorio' AS tipo,
  cc.id,
  cc.nome_consultorio AS nome,
  cc.logradouro AS endereco,
  cc.cidade,
  cc.estado,
  cc.cep,
  cc.latitude,
  cc.longitude,
  cc.geocoded_at,
  CASE WHEN cc.ativo THEN 'Ativo' ELSE 'Inativo' END AS status,
  CASE 
    WHEN cc.latitude IS NOT NULL THEN 'geocodificado'
    WHEN cc.cep IS NULL THEN 'sem_cep'
    ELSE 'pendente'
  END AS geocoding_status
FROM public.credenciado_consultorios cc
WHERE cc.ativo = true;

-- ================================================
-- 4. COMENTÁRIOS E DOCUMENTAÇÃO
-- ================================================

COMMENT ON FUNCTION public.geocodificar_consultorio_automatico() IS 
'Trigger que enfileira consultórios para geocodificação automática após inserção, se possuírem CEP';

COMMENT ON FUNCTION public.geocodificar_sede_pj_se_atende() IS 
'Trigger que geocodifica sede de PJ se flag sede_atende for true e credenciado for ativado';

COMMENT ON VIEW public.geocoding_status IS 
'View consolidada mostrando status de geocodificação de credenciados e consultórios';