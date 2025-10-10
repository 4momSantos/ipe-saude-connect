-- ============================================
-- BLOCO 1.1: Cron Jobs para Automação
-- ============================================

-- Criar cron job para aplicar regras de suspensão diariamente às 6h
SELECT cron.schedule(
  'aplicar-regras-suspensao-diario',
  '0 6 * * *', -- Todo dia às 6h da manhã
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/aplicar-regras-suspensao',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('timestamp', now())
  ) as request_id;
  $$
);

-- Criar cron job para processar descredenciamentos programados às 7h
SELECT cron.schedule(
  'processar-descredenciamentos-diario',
  '0 7 * * *', -- Todo dia às 7h da manhã
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/processar-descredenciamentos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('timestamp', now())
  ) as request_id;
  $$
);

-- Criar cron job para notificar descredenciamentos próximos às 8h
SELECT cron.schedule(
  'notificar-descredenciamentos-proximos',
  '0 8 * * *', -- Todo dia às 8h da manhã
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/notificar-descredenciamentos-proximos',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('timestamp', now())
  ) as request_id;
  $$
);

-- ============================================
-- BLOCO 3.1: Completar Função PostgreSQL
-- ============================================

-- Recriar função com todos os 4 tipos de gatilhos
CREATE OR REPLACE FUNCTION public.verificar_regras_suspensao_automatica()
RETURNS TABLE(
  credenciado_id uuid,
  credenciado_nome text,
  regra_id uuid,
  regra_nome text,
  acao text,
  motivo text,
  dados_gatilho jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regra RECORD;
  v_credenciado RECORD;
BEGIN
  -- Iterar por todas as regras ativas
  FOR v_regra IN 
    SELECT * FROM regras_suspensao_automatica 
    WHERE ativo = true 
    ORDER BY prioridade DESC
  LOOP
    
    -- GATILHO 1: Ocorrências
    IF v_regra.tipo_gatilho = 'ocorrencias' THEN
      FOR v_credenciado IN
        SELECT 
          c.id,
          c.nome,
          COUNT(o.id) as total_ocorrencias
        FROM credenciados c
        JOIN ocorrencias_prestadores o ON o.credenciado_id = c.id
        WHERE c.status = 'Ativo'
          AND o.gravidade = (v_regra.condicao->>'gravidade')::TEXT
          AND o.data_ocorrencia >= CURRENT_DATE - (v_regra.condicao->>'periodo_dias')::INTEGER
        GROUP BY c.id, c.nome
        HAVING COUNT(o.id) >= (v_regra.condicao->>'quantidade')::INTEGER
      LOOP
        RETURN QUERY SELECT
          v_credenciado.id,
          v_credenciado.nome,
          v_regra.id,
          v_regra.nome,
          v_regra.acao,
          format('%s ocorrências de gravidade %s nos últimos %s dias', 
            v_credenciado.total_ocorrencias,
            v_regra.condicao->>'gravidade',
            v_regra.condicao->>'periodo_dias'
          ),
          jsonb_build_object('total_ocorrencias', v_credenciado.total_ocorrencias);
      END LOOP;
      
    -- GATILHO 2: Avaliações
    ELSIF v_regra.tipo_gatilho = 'avaliacoes' THEN
      FOR v_credenciado IN
        SELECT 
          c.id,
          c.nome,
          COUNT(*) as avaliacoes_baixas,
          AVG(av.pontuacao_geral) as media_pontuacao
        FROM credenciados c
        JOIN avaliacoes_prestadores av ON av.credenciado_id = c.id
        WHERE c.status = 'Ativo'
          AND av.status = 'finalizada'
          AND av.pontuacao_geral < (v_regra.condicao->>'nota_minima')::NUMERIC
          AND av.periodo_referencia >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY c.id, c.nome
        HAVING COUNT(*) >= (v_regra.condicao->>'avaliacoes_consecutivas')::INTEGER
      LOOP
        RETURN QUERY SELECT
          v_credenciado.id,
          v_credenciado.nome,
          v_regra.id,
          v_regra.nome,
          v_regra.acao,
          format('%s avaliações abaixo de %.1f nos últimos 90 dias (média: %.2f)', 
            v_credenciado.avaliacoes_baixas,
            (v_regra.condicao->>'nota_minima')::NUMERIC,
            v_credenciado.media_pontuacao
          ),
          jsonb_build_object(
            'avaliacoes_baixas', v_credenciado.avaliacoes_baixas,
            'media_pontuacao', v_credenciado.media_pontuacao
          );
      END LOOP;
      
    -- GATILHO 3: Vencimento de Documentos (NOVO)
    ELSIF v_regra.tipo_gatilho = 'vencimento_docs' THEN
      FOR v_credenciado IN
        SELECT 
          c.id,
          c.nome,
          COUNT(DISTINCT id.tipo_documento) as docs_vencidos
        FROM credenciados c
        JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
        JOIN inscricao_documentos id ON id.inscricao_id = ie.id
        WHERE c.status = 'Ativo'
          AND id.is_current = true
          AND id.ocr_resultado IS NOT NULL
          AND (id.ocr_resultado->>'dataValidade')::DATE < CURRENT_DATE
          AND id.status = 'aprovado'
        GROUP BY c.id, c.nome
        HAVING COUNT(DISTINCT id.tipo_documento) >= (v_regra.condicao->>'quantidade_docs')::INTEGER
      LOOP
        RETURN QUERY SELECT
          v_credenciado.id,
          v_credenciado.nome,
          v_regra.id,
          v_regra.nome,
          v_regra.acao,
          format('%s documentos vencidos', v_credenciado.docs_vencidos),
          jsonb_build_object('docs_vencidos', v_credenciado.docs_vencidos);
      END LOOP;
      
    -- GATILHO 4: Sanções Acumuladas (NOVO)
    ELSIF v_regra.tipo_gatilho = 'sancoes_acumuladas' THEN
      FOR v_credenciado IN
        SELECT 
          c.id,
          c.nome,
          COUNT(*) as total_sancoes,
          SUM(COALESCE(s.valor_multa, 0)) as valor_total_multas
        FROM credenciados c
        JOIN sancoes_prestadores s ON s.credenciado_id = c.id
        WHERE c.status = 'Ativo'
          AND s.status = 'ativa'
          AND s.data_inicio >= CURRENT_DATE - (v_regra.condicao->>'periodo_dias')::INTEGER
        GROUP BY c.id, c.nome
        HAVING COUNT(*) >= (v_regra.condicao->>'quantidade_sancoes')::INTEGER
      LOOP
        RETURN QUERY SELECT
          v_credenciado.id,
          v_credenciado.nome,
          v_regra.id,
          v_regra.nome,
          v_regra.acao,
          format('%s sanções ativas nos últimos %s dias (multas: R$ %.2f)', 
            v_credenciado.total_sancoes,
            v_regra.condicao->>'periodo_dias',
            v_credenciado.valor_total_multas
          ),
          jsonb_build_object(
            'total_sancoes', v_credenciado.total_sancoes,
            'valor_total_multas', v_credenciado.valor_total_multas
          );
      END LOOP;
    END IF;
    
  END LOOP;
END;
$$;

-- Adicionar comentário descritivo
COMMENT ON FUNCTION public.verificar_regras_suspensao_automatica() IS 
'Verifica todas as regras de suspensão ativas e retorna credenciados que atendem aos critérios.
Suporta 4 tipos de gatilhos: ocorrencias, avaliacoes, vencimento_docs, sancoes_acumuladas.';
