-- Criar função para obter extrato de categorização
CREATE OR REPLACE FUNCTION get_extrato_categorizacao(p_credenciado_id UUID)
RETURNS TABLE (
  id UUID,
  data_alteracao TIMESTAMPTZ,
  categoria_anterior TEXT,
  categoria_anterior_codigo TEXT,
  categoria_nova TEXT,
  categoria_nova_codigo TEXT,
  tipo_operacao TEXT,
  principal_anterior BOOLEAN,
  principal_nova BOOLEAN,
  usuario_nome TEXT,
  justificativa TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ah.id,
    ah.created_at AS data_alteracao,
    cat_ant.nome AS categoria_anterior,
    cat_ant.codigo AS categoria_anterior_codigo,
    cat_nova.nome AS categoria_nova,
    cat_nova.codigo AS categoria_nova_codigo,
    CASE 
      WHEN ah.old_values IS NULL THEN 'inclusao'
      WHEN ah.new_values IS NULL THEN 'remocao'
      ELSE 'alteracao'
    END::TEXT AS tipo_operacao,
    (ah.old_values->>'principal')::BOOLEAN AS principal_anterior,
    (ah.new_values->>'principal')::BOOLEAN AS principal_nova,
    p.nome AS usuario_nome,
    ah.metadata->>'justificativa' AS justificativa
  FROM audit_logs ah
  LEFT JOIN categorias_estabelecimentos cat_ant ON cat_ant.id = (ah.old_values->>'categoria_id')::UUID
  LEFT JOIN categorias_estabelecimentos cat_nova ON cat_nova.id = (ah.new_values->>'categoria_id')::UUID
  LEFT JOIN profiles p ON p.id = ah.user_id
  WHERE ah.resource_type = 'credenciado_categoria'
    AND (
      (ah.old_values->>'credenciado_id')::UUID = p_credenciado_id
      OR (ah.new_values->>'credenciado_id')::UUID = p_credenciado_id
    )
  ORDER BY ah.created_at DESC;
END;
$$;

-- Criar função para obter estatísticas de categorização
CREATE OR REPLACE FUNCTION get_stats_categorizacao(p_credenciado_id UUID)
RETURNS TABLE (
  total_alteracoes BIGINT,
  total_inclusoes BIGINT,
  total_remocoes BIGINT,
  total_alteracoes_principal BIGINT,
  ultima_alteracao TIMESTAMPTZ,
  categorias_ja_vinculadas TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH historico AS (
    SELECT 
      ah.created_at,
      ah.old_values,
      ah.new_values,
      CASE 
        WHEN ah.old_values IS NULL THEN 'inclusao'
        WHEN ah.new_values IS NULL THEN 'remocao'
        ELSE 'alteracao'
      END AS tipo_op,
      CASE 
        WHEN (ah.old_values->>'principal')::BOOLEAN != (ah.new_values->>'principal')::BOOLEAN 
        THEN 1 
        ELSE 0 
      END AS mudou_principal
    FROM audit_logs ah
    WHERE ah.resource_type = 'credenciado_categoria'
      AND (
        (ah.old_values->>'credenciado_id')::UUID = p_credenciado_id
        OR (ah.new_values->>'credenciado_id')::UUID = p_credenciado_id
      )
  ),
  categorias_vinculadas AS (
    SELECT ARRAY_AGG(DISTINCT ce.nome) AS nomes
    FROM credenciado_categorias cc
    JOIN categorias_estabelecimentos ce ON ce.id = cc.categoria_id
    WHERE cc.credenciado_id = p_credenciado_id
  )
  SELECT 
    COUNT(*)::BIGINT AS total_alteracoes,
    COUNT(*) FILTER (WHERE tipo_op = 'inclusao')::BIGINT AS total_inclusoes,
    COUNT(*) FILTER (WHERE tipo_op = 'remocao')::BIGINT AS total_remocoes,
    SUM(mudou_principal)::BIGINT AS total_alteracoes_principal,
    MAX(created_at) AS ultima_alteracao,
    COALESCE((SELECT nomes FROM categorias_vinculadas), ARRAY[]::TEXT[]) AS categorias_ja_vinculadas
  FROM historico;
END;
$$;

-- Criar trigger para auditar mudanças em credenciado_categorias
CREATE OR REPLACE FUNCTION audit_credenciado_categoria_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      'credenciado_categoria_vinculada',
      'credenciado_categoria',
      NEW.id,
      NULL,
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM log_audit_event(
      'credenciado_categoria_atualizada',
      'credenciado_categoria',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      'credenciado_categoria_desvinculada',
      'credenciado_categoria',
      OLD.id,
      to_jsonb(OLD),
      NULL
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS audit_credenciado_categoria_trigger ON credenciado_categorias;
CREATE TRIGGER audit_credenciado_categoria_trigger
  AFTER INSERT OR UPDATE OR DELETE ON credenciado_categorias
  FOR EACH ROW
  EXECUTE FUNCTION audit_credenciado_categoria_changes();