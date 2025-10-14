-- ===============================================
-- FASE 5 + 6: Processar Contratos Pendentes + Melhorar Trigger
-- ===============================================

-- FASE 6: Criar função auxiliar robusta para criar credenciado
CREATE OR REPLACE FUNCTION sync_approved_inscricao_to_credenciado_v2(p_inscricao_id UUID)
RETURNS UUID AS $$
DECLARE
  v_inscricao RECORD;
  v_credenciado_id UUID;
  v_dados jsonb;
  v_nome text;
  v_email text;
  v_cpf text;
BEGIN
  -- Buscar inscrição
  SELECT * INTO v_inscricao
  FROM inscricoes_edital
  WHERE id = p_inscricao_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION '[SYNC_V2] Inscrição não encontrada: %', p_inscricao_id;
  END IF;
  
  -- Verificar se já existe
  SELECT id INTO v_credenciado_id
  FROM credenciados
  WHERE inscricao_id = p_inscricao_id;
  
  IF v_credenciado_id IS NOT NULL THEN
    RAISE NOTICE '[SYNC_V2] Credenciado já existe: %', v_credenciado_id;
    
    -- Apenas garantir que está ativo
    UPDATE credenciados
    SET status = 'Ativo',
        updated_at = NOW()
    WHERE id = v_credenciado_id;
    
    RETURN v_credenciado_id;
  END IF;
  
  -- Extrair dados
  v_dados := v_inscricao.dados_inscricao;
  
  v_nome := COALESCE(
    v_dados->'pessoa_juridica'->>'denominacao_social',
    v_dados->'dados_pessoais'->>'nome_completo',
    v_dados->'dadosPessoais'->>'nome'
  );
  
  v_email := COALESCE(
    v_dados->'endereco_correspondencia'->>'email',
    v_dados->'pessoa_juridica'->'contatos'->>'email',
    v_dados->'dados_pessoais'->>'email',
    v_dados->'dadosPessoais'->>'email'
  );
  
  v_cpf := COALESCE(
    v_dados->'dados_pessoais'->>'cpf',
    v_dados->'dadosPessoais'->>'cpf'
  );
  
  -- Validação obrigatória
  IF v_nome IS NULL OR v_nome = '' THEN
    RAISE EXCEPTION '[SYNC_V2] Nome é obrigatório. Inscrição: %. Dados: %', p_inscricao_id, v_dados;
  END IF;
  
  -- Criar credenciado
  INSERT INTO credenciados (
    inscricao_id,
    nome,
    cpf,
    email,
    status,
    observacoes,
    created_at,
    updated_at
  )
  VALUES (
    p_inscricao_id,
    v_nome,
    v_cpf,
    v_email,
    'Ativo',
    format('Credenciado automaticamente em %s', NOW()),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_credenciado_id;
  
  RAISE NOTICE '[SYNC_V2] Credenciado % criado com sucesso para inscrição %', v_credenciado_id, p_inscricao_id;
  
  RETURN v_credenciado_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- FASE 6: Melhorar trigger activate_credenciado_on_assinatura
CREATE OR REPLACE FUNCTION activate_credenciado_on_assinatura()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'assinado' AND (OLD IS NULL OR OLD.status != 'assinado') THEN
    RAISE NOTICE '[CONTRATO_ASSINADO] Processando inscrição % (contrato %)', NEW.inscricao_id, NEW.id;
    
    BEGIN
      -- Chamar função robusta de criação de credenciado
      PERFORM sync_approved_inscricao_to_credenciado_v2(NEW.inscricao_id);
      
      RAISE NOTICE '[CONTRATO_ASSINADO] ✅ Credenciado criado/ativado para inscrição %', NEW.inscricao_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[CONTRATO_ASSINADO] ❌ Erro ao criar credenciado: %', SQLERRM;
      -- Não impedir update do contrato mesmo se credenciado falhar
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recriar trigger
DROP TRIGGER IF EXISTS trigger_activate_credenciado_on_assinatura ON contratos;
CREATE TRIGGER trigger_activate_credenciado_on_assinatura
  AFTER UPDATE ON contratos
  FOR EACH ROW
  EXECUTE FUNCTION activate_credenciado_on_assinatura();

-- FASE 5: Processar os 2 contratos pendentes
-- Marcar como assinados para que o trigger crie os credenciados
UPDATE contratos
SET 
  status = 'assinado',
  assinado_em = NOW(),
  updated_at = NOW()
WHERE status = 'pendente_assinatura'
  AND id IN (
    'c2ab25cc-78a9-4290-b7df-0489acff75c4',  -- CONT-2025-885299
    'ce7f1656-1f02-4254-8ea8-15e7cb6be727'   -- CONT-2025-459425
  );

-- Verificar resultado
SELECT 
  c.numero_contrato,
  c.status as contrato_status,
  c.assinado_em,
  cr.id as credenciado_id,
  cr.nome as credenciado_nome,
  cr.status as credenciado_status,
  cr.created_at as credenciado_criado_em
FROM contratos c
LEFT JOIN credenciados cr ON cr.inscricao_id = c.inscricao_id
WHERE c.numero_contrato IN ('CONT-2025-885299', 'CONT-2025-459425');