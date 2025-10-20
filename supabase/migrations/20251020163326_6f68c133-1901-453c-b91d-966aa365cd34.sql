-- Função para migrar CRMs das inscrições para credenciado_crms (corrigida)
CREATE OR REPLACE FUNCTION migrar_crms_inscricoes()
RETURNS TABLE (
  resultado_credenciado_id uuid,
  resultado_numero text,
  resultado_crm text,
  resultado_uf text,
  resultado_especialidades integer
) AS $$
DECLARE
  v_credenciado RECORD;
  v_crm text;
  v_uf_crm text;
  v_especialidade_id uuid;
  v_especialidades_ids uuid[];
  v_especialidade_nome text;
  v_count integer := 0;
BEGIN
  -- Iterar por todos os credenciados com inscrição mas sem CRM
  FOR v_credenciado IN 
    SELECT 
      c.id as cred_id,
      c.numero_credenciado as num_cred,
      c.nome,
      ie.dados_inscricao
    FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    WHERE NOT EXISTS (
      SELECT 1 FROM credenciado_crms cc WHERE cc.credenciado_id = c.id
    )
    AND ie.dados_inscricao->'dados_pessoais'->>'crm' IS NOT NULL
  LOOP
    -- Extrair dados do CRM
    v_crm := v_credenciado.dados_inscricao->'dados_pessoais'->>'crm';
    v_uf_crm := v_credenciado.dados_inscricao->'dados_pessoais'->>'uf_crm';
    
    -- Pegar IDs das especialidades do consultório
    v_especialidades_ids := ARRAY(
      SELECT jsonb_array_elements_text(
        v_credenciado.dados_inscricao->'consultorio'->'especialidades_ids'
      )::uuid
    );
    
    -- Para cada especialidade, criar um registro em credenciado_crms
    IF array_length(v_especialidades_ids, 1) > 0 THEN
      FOREACH v_especialidade_id IN ARRAY v_especialidades_ids
      LOOP
        -- Buscar nome da especialidade
        SELECT nome INTO v_especialidade_nome
        FROM especialidades_medicas
        WHERE id = v_especialidade_id;
        
        IF v_especialidade_nome IS NOT NULL THEN
          -- Inserir CRM
          INSERT INTO credenciado_crms (
            credenciado_id,
            crm,
            uf_crm,
            especialidade,
            especialidade_id
          ) VALUES (
            v_credenciado.cred_id,
            v_crm,
            v_uf_crm,
            v_especialidade_nome,
            v_especialidade_id
          )
          ON CONFLICT DO NOTHING;
          
          v_count := v_count + 1;
        END IF;
      END LOOP;
    ELSE
      -- Se não tem especialidades, inserir apenas o CRM básico
      INSERT INTO credenciado_crms (
        credenciado_id,
        crm,
        uf_crm,
        especialidade
      ) VALUES (
        v_credenciado.cred_id,
        v_crm,
        v_uf_crm,
        'Medicina Geral'
      )
      ON CONFLICT DO NOTHING;
      
      v_count := 1;
    END IF;
    
    -- Retornar resultado
    resultado_credenciado_id := v_credenciado.cred_id;
    resultado_numero := v_credenciado.num_cred;
    resultado_crm := v_crm;
    resultado_uf := v_uf_crm;
    resultado_especialidades := v_count;
    v_count := 0;
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Executar a migração
SELECT * FROM migrar_crms_inscricoes();