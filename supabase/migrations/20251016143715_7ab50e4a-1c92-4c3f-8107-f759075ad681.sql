-- Funções auxiliares para histórico de documentos

-- Função para buscar histórico de documento
CREATE OR REPLACE FUNCTION get_documento_historico(p_documento_id UUID)
RETURNS TABLE (
  id UUID,
  data_alteracao TIMESTAMPTZ,
  status_anterior TEXT,
  status_novo TEXT,
  tipo_alteracao TEXT,
  comentario TEXT,
  alterado_por_nome TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dsh.id,
    dsh.data_alteracao,
    dsh.status_anterior,
    dsh.status_novo,
    dsh.tipo_alteracao,
    dsh.comentario,
    p.nome AS alterado_por_nome
  FROM public.documentos_status_historico dsh
  LEFT JOIN public.profiles p ON p.id = dsh.alterado_por
  WHERE dsh.documento_id = p_documento_id
  ORDER BY dsh.data_alteracao DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar histórico manual
CREATE OR REPLACE FUNCTION registrar_historico_manual(
  p_documento_id UUID,
  p_comentario TEXT
)
RETURNS VOID AS $$
DECLARE
  v_status_atual TEXT;
BEGIN
  -- Buscar status atual do documento
  SELECT status INTO v_status_atual
  FROM public.documentos_credenciados
  WHERE id = p_documento_id;
  
  -- Inserir histórico
  INSERT INTO public.documentos_status_historico (
    documento_id,
    status_novo,
    tipo_alteracao,
    alterado_por,
    comentario
  ) VALUES (
    p_documento_id,
    v_status_atual,
    'correcao_manual',
    auth.uid(),
    p_comentario
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;