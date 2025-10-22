-- ============================================================================
-- Migration: Fix Automatic CRM Sync for Credenciados
-- Objetivo: Corrigir função sync_approved_inscricao_to_credenciado_v2 e 
--           retroativamente criar CRMs para credenciados existentes
-- ============================================================================

-- 1. Corrigir a função de sincronização
CREATE OR REPLACE FUNCTION public.sync_approved_inscricao_to_credenciado_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_credenciado_id UUID;
  v_dados JSONB;
  v_tipo_credenciamento TEXT;
  v_crm TEXT;
  v_uf_crm TEXT;
  v_especialidades_ids TEXT[];
  v_esp_id UUID;
  v_esp_nome TEXT;
  v_count INTEGER := 0;
BEGIN
  -- Só processar quando status muda para 'aprovado'
  IF NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado') THEN
    
    RAISE NOTICE '[SYNC] Processando inscrição aprovada: %', NEW.id;
    
    -- Buscar credenciado existente
    SELECT id INTO v_credenciado_id
    FROM public.credenciados
    WHERE inscricao_id = NEW.id;
    
    IF v_credenciado_id IS NULL THEN
      RAISE NOTICE '[SYNC] Nenhum credenciado encontrado para inscrição %', NEW.id;
      RETURN NEW;
    END IF;
    
    -- Buscar dados da inscrição
    v_dados := NEW.dados_inscricao;
    
    IF v_dados IS NULL THEN
      RAISE WARNING '[SYNC] ⚠️ Dados de inscrição ausentes';
      RETURN NEW;
    END IF;
    
    -- Determinar tipo de credenciamento
    v_tipo_credenciamento := v_dados->>'tipo_credenciamento';
    
    IF v_tipo_credenciamento IS NULL THEN
      v_tipo_credenciamento := CASE 
        WHEN v_dados->'dados_pessoais'->>'cpf' IS NOT NULL THEN 'PF'
        WHEN v_dados->'dados_pessoais'->>'cnpj' IS NOT NULL THEN 'PJ'
        ELSE 'PF'
      END;
    END IF;
    
    -- Processar CRMs apenas para PF
    IF v_tipo_credenciamento = 'PF' THEN
      
      -- Extrair CRM e UF dos dados pessoais (caminho correto)
      v_crm := v_dados->'dados_pessoais'->>'crm';
      v_uf_crm := v_dados->'dados_pessoais'->>'uf_crm';
      
      IF v_crm IS NULL OR v_uf_crm IS NULL THEN
        RAISE WARNING '[SYNC] ⚠️ CRM ou UF_CRM ausente para credenciado %', v_credenciado_id;
        RETURN NEW;
      END IF;
      
      -- Extrair especialidades de consultorio.especialidades_ids
      IF v_dados->'consultorio'->'especialidades_ids' IS NOT NULL THEN
        SELECT ARRAY_AGG(value::text)
        INTO v_especialidades_ids
        FROM jsonb_array_elements_text(v_dados->'consultorio'->'especialidades_ids');
      END IF;
      
      -- Criar CRMs com especialidades
      IF v_especialidades_ids IS NOT NULL AND array_length(v_especialidades_ids, 1) > 0 THEN
        
        RAISE NOTICE '[SYNC] Processando % especialidades', array_length(v_especialidades_ids, 1);
        
        FOR i IN 1..array_length(v_especialidades_ids, 1) LOOP
          BEGIN
            v_esp_id := v_especialidades_ids[i]::UUID;
            
            -- Buscar nome da especialidade
            SELECT nome INTO v_esp_nome
            FROM public.especialidades_medicas
            WHERE id = v_esp_id;
            
            IF v_esp_nome IS NOT NULL THEN
              -- Inserir CRM com especialidade (colunas corretas)
              INSERT INTO public.credenciado_crms (
                credenciado_id,
                crm,
                uf_crm,
                especialidade,
                especialidade_id
              )
              VALUES (
                v_credenciado_id,
                v_crm,
                v_uf_crm,
                v_esp_nome,
                v_esp_id
              )
              ON CONFLICT (credenciado_id, crm, uf_crm) 
              DO UPDATE SET
                especialidade = EXCLUDED.especialidade,
                especialidade_id = EXCLUDED.especialidade_id;
              
              v_count := v_count + 1;
              RAISE NOTICE '[SYNC] ✅ CRM %/% criado com especialidade "%"', 
                v_crm, v_uf_crm, v_esp_nome;
            ELSE
              RAISE WARNING '[SYNC] ⚠️ Especialidade % não encontrada', v_esp_id;
            END IF;
            
          EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '[SYNC] ❌ Erro ao processar especialidade %: %', 
              v_especialidades_ids[i], SQLERRM;
          END;
        END LOOP;
        
      ELSE
        -- Sem especialidades: criar CRM genérico
        BEGIN
          INSERT INTO public.credenciado_crms (
            credenciado_id,
            crm,
            uf_crm,
            especialidade,
            especialidade_id
          )
          VALUES (
            v_credenciado_id,
            v_crm,
            v_uf_crm,
            'Não informada',
            NULL
          )
          ON CONFLICT (credenciado_id, crm, uf_crm) DO NOTHING;
          
          v_count := 1;
          RAISE NOTICE '[SYNC] ⚠️ CRM %/% criado sem especialidade', v_crm, v_uf_crm;
          
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '[SYNC] ❌ Erro ao criar CRM: %', SQLERRM;
        END;
      END IF;
      
      -- Atualizar status do credenciado para Ativo se CRMs foram criados
      IF v_count > 0 THEN
        UPDATE public.credenciados
        SET status = 'Ativo'
        WHERE id = v_credenciado_id AND status = 'Incompleto';
        
        RAISE NOTICE '[SYNC] 🎉 Credenciado % atualizado: % CRMs criados', 
          v_credenciado_id, v_count;
      END IF;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. Script de Correção Retroativa
-- ============================================================================

DO $$
DECLARE
  v_credenciado RECORD;
  v_dados JSONB;
  v_crm TEXT;
  v_uf_crm TEXT;
  v_especialidades_ids TEXT[];
  v_esp_id UUID;
  v_esp_nome TEXT;
  v_crm_count INTEGER := 0;
  v_total INTEGER;
  v_processed INTEGER := 0;
BEGIN
  -- Contar credenciados PF sem CRM
  SELECT COUNT(*) INTO v_total
  FROM public.credenciados c
  LEFT JOIN public.credenciado_crms crm ON crm.credenciado_id = c.id
  WHERE c.inscricao_id IS NOT NULL
    AND c.tipo_credenciamento = 'PF'
    AND crm.id IS NULL;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔧 Correção Retroativa: % credenciados PF sem CRM', v_total;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF v_total = 0 THEN
    RAISE NOTICE '✅ Nenhum credenciado PF sem CRM encontrado';
    RETURN;
  END IF;
  
  -- Processar cada credenciado sem CRM
  FOR v_credenciado IN
    SELECT 
      c.id,
      c.nome,
      c.cpf,
      c.status,
      ie.dados_inscricao
    FROM public.credenciados c
    INNER JOIN public.inscricoes_edital ie ON ie.id = c.inscricao_id
    LEFT JOIN public.credenciado_crms crm ON crm.credenciado_id = c.id
    WHERE c.tipo_credenciamento = 'PF'
      AND crm.id IS NULL
  LOOP
    v_processed := v_processed + 1;
    v_dados := v_credenciado.dados_inscricao;
    
    IF v_dados IS NULL THEN
      RAISE WARNING '[%/%] ⚠️ [%] Sem dados de inscrição', 
        v_processed, v_total, v_credenciado.nome;
      CONTINUE;
    END IF;
    
    -- Extrair CRM e UF
    v_crm := v_dados->'dados_pessoais'->>'crm';
    v_uf_crm := v_dados->'dados_pessoais'->>'uf_crm';
    
    IF v_crm IS NULL OR v_uf_crm IS NULL THEN
      RAISE WARNING '[%/%] ⚠️ [%] CRM ou UF ausente', 
        v_processed, v_total, v_credenciado.nome;
      CONTINUE;
    END IF;
    
    -- Extrair especialidades
    v_especialidades_ids := NULL;
    IF v_dados->'consultorio'->'especialidades_ids' IS NOT NULL THEN
      SELECT ARRAY_AGG(value::text)
      INTO v_especialidades_ids
      FROM jsonb_array_elements_text(v_dados->'consultorio'->'especialidades_ids');
    END IF;
    
    -- Criar CRMs
    IF v_especialidades_ids IS NOT NULL AND array_length(v_especialidades_ids, 1) > 0 THEN
      -- Com especialidades
      FOR i IN 1..array_length(v_especialidades_ids, 1) LOOP
        BEGIN
          v_esp_id := v_especialidades_ids[i]::UUID;
          
          SELECT nome INTO v_esp_nome
          FROM public.especialidades_medicas
          WHERE id = v_esp_id;
          
          IF v_esp_nome IS NOT NULL THEN
            INSERT INTO public.credenciado_crms (
              credenciado_id,
              crm,
              uf_crm,
              especialidade,
              especialidade_id
            )
            VALUES (
              v_credenciado.id,
              v_crm,
              v_uf_crm,
              v_esp_nome,
              v_esp_id
            )
            ON CONFLICT (credenciado_id, crm, uf_crm) DO NOTHING;
            
            v_crm_count := v_crm_count + 1;
            RAISE NOTICE '[%/%] ✅ [%] CRM %/% + "%"', 
              v_processed, v_total, v_credenciado.nome, v_crm, v_uf_crm, v_esp_nome;
          END IF;
          
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '[%/%] ❌ [%] Erro: %', 
            v_processed, v_total, v_credenciado.nome, SQLERRM;
        END;
      END LOOP;
      
    ELSE
      -- Sem especialidades
      BEGIN
        INSERT INTO public.credenciado_crms (
          credenciado_id,
          crm,
          uf_crm,
          especialidade,
          especialidade_id
        )
        VALUES (
          v_credenciado.id,
          v_crm,
          v_uf_crm,
          'Não informada',
          NULL
        )
        ON CONFLICT (credenciado_id, crm, uf_crm) DO NOTHING;
        
        v_crm_count := v_crm_count + 1;
        RAISE NOTICE '[%/%] ⚠️ [%] CRM %/% sem especialidade', 
          v_processed, v_total, v_credenciado.nome, v_crm, v_uf_crm;
          
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[%/%] ❌ [%] Erro: %', 
          v_processed, v_total, v_credenciado.nome, SQLERRM;
      END;
    END IF;
    
  END LOOP;
  
  -- Atualizar status dos credenciados corrigidos
  UPDATE public.credenciados c
  SET status = 'Ativo'
  FROM public.credenciado_crms crm
  WHERE crm.credenciado_id = c.id
    AND c.status = 'Incompleto'
    AND c.tipo_credenciamento = 'PF';
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🎉 Correção Concluída';
  RAISE NOTICE '   • Credenciados processados: %', v_processed;
  RAISE NOTICE '   • CRMs criados: %', v_crm_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;