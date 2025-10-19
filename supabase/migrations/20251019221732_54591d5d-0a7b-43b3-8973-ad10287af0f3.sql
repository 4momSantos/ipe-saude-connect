
-- ============================================
-- DIAGNÓSTICO: TRIGGER DE BACKUP PARA ATIVAÇÃO
-- ============================================

-- Função de backup que ativa credenciado quando contrato é assinado
CREATE OR REPLACE FUNCTION backup_activate_credenciado_on_signed_contract()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_inscricao_id UUID;
  v_credenciado_exists BOOLEAN;
  v_credenciado_id UUID;
BEGIN
  -- Só processa se status mudou para 'assinado'
  IF NEW.status = 'assinado' AND (OLD.status IS NULL OR OLD.status != 'assinado') THEN
    
    v_inscricao_id := NEW.inscricao_id;
    
    RAISE NOTICE '[BACKUP_TRIGGER] Contrato % assinado para inscrição %', 
      NEW.numero_contrato, v_inscricao_id;
    
    -- Verificar se credenciado já existe
    SELECT EXISTS(
      SELECT 1 FROM credenciados 
      WHERE inscricao_id = v_inscricao_id
    ) INTO v_credenciado_exists;
    
    IF v_credenciado_exists THEN
      -- Atualizar credenciado existente
      UPDATE credenciados
      SET 
        status = 'Ativo',
        observacoes = COALESCE(observacoes, '') || 
          E'\n✅ [BACKUP] Contrato assinado em ' || 
          to_char(NOW(), 'DD/MM/YYYY HH24:MI:SS'),
        updated_at = NOW()
      WHERE inscricao_id = v_inscricao_id
      RETURNING id INTO v_credenciado_id;
      
      RAISE NOTICE '[BACKUP_TRIGGER] ✅ Credenciado % ativado', v_credenciado_id;
    ELSE
      -- Criar credenciado se não existir
      -- Buscar dados da inscrição
      DECLARE
        v_dados_inscricao JSONB;
        v_dados_pessoais JSONB;
      BEGIN
        SELECT dados_inscricao INTO v_dados_inscricao
        FROM inscricoes_edital
        WHERE id = v_inscricao_id;
        
        v_dados_pessoais := COALESCE(v_dados_inscricao->'dadosPessoais', '{}'::jsonb);
        
        INSERT INTO credenciados (
          inscricao_id,
          nome,
          cpf,
          email,
          status,
          observacoes
        )
        VALUES (
          v_inscricao_id,
          COALESCE(v_dados_pessoais->>'nome', 'Não informado'),
          v_dados_pessoais->>'cpf',
          v_dados_pessoais->>'email',
          'Ativo',
          '✅ [BACKUP] Credenciado criado via contrato assinado em ' || 
            to_char(NOW(), 'DD/MM/YYYY HH24:MI:SS')
        )
        RETURNING id INTO v_credenciado_id;
        
        RAISE NOTICE '[BACKUP_TRIGGER] ✅ Credenciado % criado', v_credenciado_id;
      END;
    END IF;
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Não falhar o update do contrato se backup trigger falhar
    RAISE WARNING '[BACKUP_TRIGGER] ❌ Erro: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Aplicar trigger (substituir se já existir)
DROP TRIGGER IF EXISTS backup_activate_on_contract_signed ON contratos;
CREATE TRIGGER backup_activate_on_contract_signed
  AFTER UPDATE ON contratos
  FOR EACH ROW
  EXECUTE FUNCTION backup_activate_credenciado_on_signed_contract();

-- Comentário final
COMMENT ON FUNCTION backup_activate_credenciado_on_signed_contract IS 
  'Trigger de backup que garante ativação de credenciado quando contrato é assinado. Funciona em conjunto com assinafy-webhook-finalizacao.';
