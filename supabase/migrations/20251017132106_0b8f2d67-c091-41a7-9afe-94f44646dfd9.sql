-- ============================================================================
-- MIGRATION: Ajustar trigger de geocodificação PJ e análise de dados legados
-- ============================================================================

-- 1. Corrigir trigger para geocodificar sede PJ com endereço estruturado
CREATE OR REPLACE FUNCTION public.geocodificar_sede_pj_se_atende()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dados jsonb;
  v_endereco_sede text;
  v_supabase_url text;
  v_service_role_key text;
BEGIN
  -- Só geocodificar se status mudou para Ativo e ainda não tem coordenadas
  IF NEW.status = 'Ativo' AND (OLD IS NULL OR OLD.status != 'Ativo') AND NEW.latitude IS NULL THEN
    
    v_dados := (
      SELECT dados_inscricao 
      FROM public.inscricoes_edital 
      WHERE id = NEW.inscricao_id
    );
    
    -- Verificar se sede atende e se é PJ
    IF v_dados->'pessoa_juridica'->>'sede_atende' = 'true' THEN
      
      -- Montar endereço completo da sede PJ usando estrutura correta
      v_endereco_sede := CONCAT_WS(', ',
        v_dados->'pessoa_juridica'->'endereco'->>'logradouro',
        v_dados->'pessoa_juridica'->'endereco'->>'numero',
        v_dados->'pessoa_juridica'->'endereco'->>'complemento',
        v_dados->'pessoa_juridica'->'endereco'->>'bairro',
        v_dados->'pessoa_juridica'->'endereco'->>'cidade',
        v_dados->'pessoa_juridica'->'endereco'->>'estado',
        'Brasil'
      );
      
      -- Obter URL do Supabase
      v_supabase_url := current_setting('app.settings', true)::json->>'supabase_url';
      IF v_supabase_url IS NULL THEN
        v_supabase_url := 'https://ncmofeencqpqhtguxmvy.supabase.co';
      END IF;
      
      v_service_role_key := current_setting('app.settings', true)::json->>'service_role_key';
      
      -- Chamar edge function de geocodificação
      PERFORM net.http_post(
        url := v_supabase_url || '/functions/v1/geocodificar-credenciado',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(v_service_role_key, '')
        ),
        body := jsonb_build_object(
          'credenciado_id', NEW.id::text,
          'endereco_completo', v_endereco_sede
        )
      );
      
      RAISE NOTICE '[GEOCODING] Sede PJ % enfileirada para geocodificação', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 2. Criar função para identificar dados legados (análise)
CREATE OR REPLACE FUNCTION public.analisar_inscricoes_legadas()
RETURNS TABLE (
  inscricao_id uuid,
  protocolo text,
  credenciado_nome text,
  tem_endereco_estruturado boolean,
  tem_cep boolean,
  tem_endereco_legado boolean,
  endereco_legado text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.protocolo,
    c.nome,
    (i.dados_inscricao->'endereco_correspondencia' IS NOT NULL) as tem_endereco_estruturado,
    (i.dados_inscricao->'endereco_correspondencia'->>'cep' IS NOT NULL) as tem_cep,
    (i.dados_inscricao->>'endereco' IS NOT NULL) as tem_endereco_legado,
    i.dados_inscricao->>'endereco' as endereco_legado,
    i.status
  FROM public.inscricoes_edital i
  LEFT JOIN public.credenciados c ON c.inscricao_id = i.id
  WHERE i.status = 'aprovado'
    AND (
      i.dados_inscricao->'endereco_correspondencia'->>'cep' IS NULL
      OR i.dados_inscricao->>'endereco' IS NOT NULL
    )
  ORDER BY i.created_at DESC;
END;
$function$;

-- 3. Criar função para estatísticas de geocodificação
CREATE OR REPLACE FUNCTION public.estatisticas_geocodificacao()
RETURNS TABLE (
  total_credenciados bigint,
  total_consultorios bigint,
  credenciados_geocodificados bigint,
  consultorios_geocodificados bigint,
  credenciados_pendentes bigint,
  consultorios_pendentes bigint,
  percentual_credenciados numeric,
  percentual_consultorios numeric,
  inscricoes_sem_cep bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.credenciados WHERE status = 'Ativo') as total_credenciados,
    (SELECT COUNT(*) FROM public.credenciado_consultorios WHERE ativo = true) as total_consultorios,
    (SELECT COUNT(*) FROM public.credenciados WHERE status = 'Ativo' AND latitude IS NOT NULL) as credenciados_geocodificados,
    (SELECT COUNT(*) FROM public.credenciado_consultorios WHERE ativo = true AND latitude IS NOT NULL) as consultorios_geocodificados,
    (SELECT COUNT(*) FROM public.credenciados WHERE status = 'Ativo' AND latitude IS NULL) as credenciados_pendentes,
    (SELECT COUNT(*) FROM public.credenciado_consultorios WHERE ativo = true AND latitude IS NULL) as consultorios_pendentes,
    ROUND(
      100.0 * (SELECT COUNT(*) FROM public.credenciados WHERE status = 'Ativo' AND latitude IS NOT NULL) / 
      NULLIF((SELECT COUNT(*) FROM public.credenciados WHERE status = 'Ativo'), 0),
      2
    ) as percentual_credenciados,
    ROUND(
      100.0 * (SELECT COUNT(*) FROM public.credenciado_consultorios WHERE ativo = true AND latitude IS NOT NULL) / 
      NULLIF((SELECT COUNT(*) FROM public.credenciado_consultorios WHERE ativo = true), 0),
      2
    ) as percentual_consultorios,
    (
      SELECT COUNT(*) 
      FROM public.inscricoes_edital i
      WHERE i.status = 'aprovado'
        AND i.dados_inscricao->'endereco_correspondencia'->>'cep' IS NULL
    ) as inscricoes_sem_cep;
END;
$function$;

-- 4. Adicionar comentários para documentação
COMMENT ON FUNCTION public.geocodificar_sede_pj_se_atende() IS 
'Trigger para geocodificar automaticamente a sede de PJ quando sede_atende=true';

COMMENT ON FUNCTION public.analisar_inscricoes_legadas() IS 
'Identifica inscrições com dados de endereço em formato legado que precisam migração';

COMMENT ON FUNCTION public.estatisticas_geocodificacao() IS 
'Retorna estatísticas consolidadas do status de geocodificação do sistema';