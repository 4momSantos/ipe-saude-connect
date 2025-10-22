-- ============================================================================
-- Migration: Corrigir tipo_credenciamento NULL e Reprocessar CRMs
-- Data: 2025-10-22
-- Descrição: 
--   1. Preenche tipo_credenciamento NULL baseado em CPF/CNPJ
--   2. Modifica sync_approved_inscricao_to_credenciado_v2 para tolerar NULL
--   3. Executa correção retroativa para criar CRMs faltantes
-- ============================================================================

-- ============================================================================
-- PARTE 1: Preencher tipo_credenciamento NULL
-- ============================================================================

DO $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE credenciados
  SET tipo_credenciamento = CASE
    WHEN cpf IS NOT NULL AND cnpj IS NULL THEN 'PF'
    WHEN cnpj IS NOT NULL THEN 'PJ'
    ELSE 'PF'
  END
  WHERE tipo_credenciamento IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '[TIPO_CRED] ✅ % credenciados com tipo_credenciamento atualizado', v_updated;
END $$;

-- ============================================================================
-- PARTE 2: Modificar Função para Tolerar tipo_credenciamento NULL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dados JSONB;
  v_tipo_credenciamento TEXT;
  v_credenciado_id UUID;
  v_crm TEXT;
  v_uf_crm TEXT;
  v_especialidades_ids UUID[];
  v_especialidade_id UUID;
  v_especialidade_nome TEXT;
  v_count INTEGER := 0;
BEGIN
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    RAISE NOTICE '[SYNC_V2] Inscrição % aprovada', NEW.id;
    
    SELECT id, tipo_credenciamento INTO v_credenciado_id, v_tipo_credenciamento
    FROM credenciados WHERE inscricao_id = NEW.id;
    
    IF v_credenciado_id IS NULL THEN
      RAISE WARNING '[SYNC_V2] Credenciado não encontrado para inscrição %', NEW.id;
      RETURN NEW;
    END IF;
    
    v_dados := NEW.dados_inscricao;
    
    -- ========================================================================
    -- MUDANÇA: Tolerar tipo_credenciamento NULL ou verificar se tem CPF
    -- ========================================================================
    IF v_tipo_credenciamento IN ('PF') OR 
       (v_tipo_credenciamento IS NULL AND v_dados->'dados_pessoais'->>'cpf' IS NOT NULL) THEN
      
      RAISE NOTICE '[SYNC_V2] Processando CRM para credenciado PF %', v_credenciado_id;
      
      v_crm := v_dados->'dados_pessoais'->>'crm';
      v_uf_crm := v_dados->'dados_pessoais'->>'uf_crm';
      
      IF v_crm IS NULL OR v_uf_crm IS NULL THEN
        RAISE WARNING '[SYNC_V2] CRM ou UF-CRM não encontrado em dados_pessoais';
        RETURN NEW;
      END IF;
      
      -- Buscar especialidades do primeiro consultório
      IF jsonb_typeof(v_dados->'consultorios') = 'array' AND jsonb_array_length(v_dados->'consultorios') > 0 THEN
        BEGIN
          v_especialidades_ids := ARRAY(
            SELECT jsonb_array_elements_text(v_dados->'consultorios'->0->'especialidades_ids')::UUID
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '[SYNC_V2] Erro ao extrair especialidades_ids: %', SQLERRM;
          v_especialidades_ids := ARRAY[]::UUID[];
        END;
      END IF;
      
      IF array_length(v_especialidades_ids, 1) IS NULL OR array_length(v_especialidades_ids, 1) = 0 THEN
        RAISE NOTICE '[SYNC_V2] Nenhuma especialidade encontrada, criando CRM genérico';
        
        INSERT INTO credenciado_crms (credenciado_id, crm, uf_crm, especialidade, especialidade_id)
        VALUES (v_credenciado_id, v_crm, v_uf_crm, 'Medicina Geral', NULL)
        ON CONFLICT (credenciado_id, crm, uf_crm, COALESCE(especialidade_id::text, 'null')) DO NOTHING;
        
        v_count := 1;
      ELSE
        FOREACH v_especialidade_id IN ARRAY v_especialidades_ids LOOP
          SELECT nome INTO v_especialidade_nome
          FROM especialidades_medicas WHERE id = v_especialidade_id;
          
          IF v_especialidade_nome IS NULL THEN
            RAISE WARNING '[SYNC_V2] Especialidade % não encontrada', v_especialidade_id;
            CONTINUE;
          END IF;
          
          INSERT INTO credenciado_crms (credenciado_id, crm, uf_crm, especialidade, especialidade_id)
          VALUES (v_credenciado_id, v_crm, v_uf_crm, v_especialidade_nome, v_especialidade_id)
          ON CONFLICT (credenciado_id, crm, uf_crm, COALESCE(especialidade_id::text, 'null')) DO NOTHING;
          
          v_count := v_count + 1;
          RAISE NOTICE '[SYNC_V2] CRM criado: %/% - %', v_crm, v_uf_crm, v_especialidade_nome;
        END LOOP;
      END IF;
      
      IF v_count > 0 THEN
        UPDATE credenciados SET status = 'Ativo' WHERE id = v_credenciado_id AND status = 'Incompleto';
        RAISE NOTICE '[SYNC_V2] ✅ % CRMs criados para credenciado %', v_count, v_credenciado_id;
      END IF;
      
    ELSIF v_tipo_credenciamento = 'PJ' THEN
      RAISE NOTICE '[SYNC_V2] Credenciado PJ - CRMs virão de profissionais vinculados';
    ELSE
      RAISE WARNING '[SYNC_V2] Tipo credenciamento desconhecido: %', v_tipo_credenciamento;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PARTE 3: Correção Retroativa - Criar CRMs para Credenciados sem CRM
-- ============================================================================

DO $$
DECLARE
  v_credenciado RECORD;
  v_dados JSONB;
  v_crm TEXT;
  v_uf_crm TEXT;
  v_especialidades_ids UUID[];
  v_especialidade_id UUID;
  v_especialidade_nome TEXT;
  v_crm_count INTEGER := 0;
  v_credenciado_count INTEGER := 0;
  v_total_crms INTEGER := 0;
BEGIN
  RAISE NOTICE '[RETROATIVO] Iniciando correção retroativa de CRMs...';
  
  FOR v_credenciado IN
    SELECT 
      c.id,
      c.nome,
      c.cpf,
      c.cnpj,
      c.tipo_credenciamento,
      ie.dados_inscricao
    FROM credenciados c
    INNER JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    LEFT JOIN credenciado_crms crm ON crm.credenciado_id = c.id
    WHERE crm.id IS NULL
      AND c.cpf IS NOT NULL
      AND c.cnpj IS NULL
      AND c.status = 'Incompleto'
  LOOP
    v_dados := v_credenciado.dados_inscricao;
    v_crm_count := 0;
    
    v_crm := v_dados->'dados_pessoais'->>'crm';
    v_uf_crm := v_dados->'dados_pessoais'->>'uf_crm';
    
    IF v_crm IS NULL OR v_uf_crm IS NULL THEN
      RAISE WARNING '[RETROATIVO] Credenciado % sem CRM/UF em dados_inscricao', v_credenciado.nome;
      CONTINUE;
    END IF;
    
    IF jsonb_typeof(v_dados->'consultorios') = 'array' AND jsonb_array_length(v_dados->'consultorios') > 0 THEN
      BEGIN
        v_especialidades_ids := ARRAY(
          SELECT jsonb_array_elements_text(v_dados->'consultorios'->0->'especialidades_ids')::UUID
        );
      EXCEPTION WHEN OTHERS THEN
        v_especialidades_ids := ARRAY[]::UUID[];
      END;
    ELSE
      v_especialidades_ids := ARRAY[]::UUID[];
    END IF;
    
    IF array_length(v_especialidades_ids, 1) IS NULL OR array_length(v_especialidades_ids, 1) = 0 THEN
      INSERT INTO credenciado_crms (credenciado_id, crm, uf_crm, especialidade, especialidade_id)
      VALUES (v_credenciado.id, v_crm, v_uf_crm, 'Medicina Geral', NULL)
      ON CONFLICT (credenciado_id, crm, uf_crm, COALESCE(especialidade_id::text, 'null')) DO NOTHING;
      
      v_crm_count := 1;
    ELSE
      FOREACH v_especialidade_id IN ARRAY v_especialidades_ids LOOP
        SELECT nome INTO v_especialidade_nome
        FROM especialidades_medicas WHERE id = v_especialidade_id;
        
        IF v_especialidade_nome IS NOT NULL THEN
          INSERT INTO credenciado_crms (credenciado_id, crm, uf_crm, especialidade, especialidade_id)
          VALUES (v_credenciado.id, v_crm, v_uf_crm, v_especialidade_nome, v_especialidade_id)
          ON CONFLICT (credenciado_id, crm, uf_crm, COALESCE(especialidade_id::text, 'null')) DO NOTHING;
          
          v_crm_count := v_crm_count + 1;
        END IF;
      END LOOP;
    END IF;
    
    IF v_crm_count > 0 THEN
      UPDATE credenciados SET status = 'Ativo' WHERE id = v_credenciado.id;
      v_credenciado_count := v_credenciado_count + 1;
      v_total_crms := v_total_crms + v_crm_count;
      
      RAISE NOTICE '[RETROATIVO] ✅ % (%): % CRMs criados', 
        v_credenciado.nome, v_crm, v_crm_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '[RETROATIVO] ========================================';
  RAISE NOTICE '[RETROATIVO] ✅ CONCLUÍDO';
  RAISE NOTICE '[RETROATIVO] Credenciados corrigidos: %', v_credenciado_count;
  RAISE NOTICE '[RETROATIVO] Total de CRMs criados: %', v_total_crms;
  RAISE NOTICE '[RETROATIVO] ========================================';
END $$;