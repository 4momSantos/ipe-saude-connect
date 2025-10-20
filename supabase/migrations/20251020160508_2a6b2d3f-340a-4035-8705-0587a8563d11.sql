-- FASE 1: Correção Estrutural do Sistema de Prazos

-- 1.1. Reativar documentos arquivados
UPDATE documentos_credenciados 
SET 
  status = 'ativo',
  is_current = true
WHERE status = 'arquivado';

-- 1.2. Popular controle_prazos com documentos existentes (sem ON CONFLICT)
INSERT INTO controle_prazos (
  entidade_tipo,
  entidade_id,
  entidade_nome,
  credenciado_id,
  data_vencimento,
  status_atual,
  ativo,
  renovavel
)
SELECT 
  'documento_credenciado',
  dc.id,
  dc.tipo_documento,
  dc.credenciado_id,
  dc.data_vencimento,
  dc.status,
  true,
  true
FROM documentos_credenciados dc
WHERE dc.is_current = true
  AND dc.status = 'ativo'
  AND NOT EXISTS (
    SELECT 1 FROM controle_prazos cp 
    WHERE cp.entidade_id = dc.id AND cp.entidade_tipo = 'documento_credenciado'
  );

-- 1.3. Criar trigger para sincronização automática
CREATE OR REPLACE FUNCTION sync_documento_controle_prazos()
RETURNS TRIGGER AS $$
BEGIN
  -- Só sincronizar se documento for is_current = true
  IF NEW.is_current = true THEN
    -- Verificar se já existe
    IF EXISTS (SELECT 1 FROM controle_prazos WHERE entidade_id = NEW.id AND entidade_tipo = 'documento_credenciado') THEN
      -- Atualizar existente
      UPDATE controle_prazos
      SET 
        data_vencimento = NEW.data_vencimento,
        status_atual = NEW.status,
        atualizado_em = NOW(),
        ativo = true
      WHERE entidade_id = NEW.id AND entidade_tipo = 'documento_credenciado';
    ELSE
      -- Inserir novo
      INSERT INTO controle_prazos (
        entidade_tipo,
        entidade_id,
        entidade_nome,
        credenciado_id,
        data_vencimento,
        status_atual,
        ativo,
        renovavel
      ) VALUES (
        'documento_credenciado',
        NEW.id,
        NEW.tipo_documento,
        NEW.credenciado_id,
        NEW.data_vencimento,
        NEW.status,
        true,
        true
      );
    END IF;
  ELSE
    -- Se documento deixou de ser current, desativar em controle_prazos
    UPDATE controle_prazos
    SET ativo = false, atualizado_em = NOW()
    WHERE entidade_id = NEW.id AND entidade_tipo = 'documento_credenciado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_sync_documento_prazos ON documentos_credenciados;
CREATE TRIGGER trigger_sync_documento_prazos
  AFTER INSERT OR UPDATE OF data_vencimento, is_current, status
  ON documentos_credenciados
  FOR EACH ROW
  EXECUTE FUNCTION sync_documento_controle_prazos();