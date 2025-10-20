-- Criar função para processar decisão de forma atômica
CREATE OR REPLACE FUNCTION processar_decisao_inscricao(
  p_inscricao_id UUID,
  p_analise_id UUID,
  p_analista_id UUID,
  p_status_decisao TEXT,
  p_justificativa TEXT,
  p_motivo_reprovacao TEXT DEFAULT NULL,
  p_campos_reprovados JSONB DEFAULT NULL,
  p_documentos_reprovados JSONB DEFAULT NULL,
  p_prazo_correcao TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status_analise TEXT;
  v_status_inscricao TEXT;
BEGIN
  -- Mapear status da decisão para análise
  v_status_analise := CASE p_status_decisao
    WHEN 'aprovado' THEN 'aprovado'
    WHEN 'reprovado' THEN 'rejeitado'
    ELSE 'pendente_correcao'
  END;
  
  -- Mapear status da decisão para inscrição
  v_status_inscricao := CASE p_status_decisao
    WHEN 'aprovado' THEN 'aprovado'
    WHEN 'reprovado' THEN 'inabilitado'
    ELSE 'aguardando_correcao'
  END;

  -- 1. Atualizar análise PRIMEIRO (dentro da mesma transação)
  UPDATE analises SET
    status = v_status_analise,
    parecer = p_justificativa,
    motivo_reprovacao = p_motivo_reprovacao,
    campos_reprovados = p_campos_reprovados,
    documentos_reprovados = p_documentos_reprovados,
    prazo_correcao = p_prazo_correcao,
    analista_id = p_analista_id,
    analisado_em = NOW(),
    updated_at = NOW()
  WHERE id = p_analise_id;

  -- 2. Atualizar inscrição DEPOIS (trigger verá análise já atualizada)
  UPDATE inscricoes_edital SET
    status = v_status_inscricao,
    analisado_por = p_analista_id,
    analisado_em = NOW(),
    updated_at = NOW()
  WHERE id = p_inscricao_id;

  -- Retornar sucesso
  RETURN jsonb_build_object(
    'success', true,
    'status_analise', v_status_analise,
    'status_inscricao', v_status_inscricao,
    'inscricao_id', p_inscricao_id,
    'analise_id', p_analise_id
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, tudo será revertido automaticamente
  RAISE EXCEPTION 'Erro ao processar decisão: %', SQLERRM;
END;
$$;

-- Garantir permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION processar_decisao_inscricao TO authenticated;