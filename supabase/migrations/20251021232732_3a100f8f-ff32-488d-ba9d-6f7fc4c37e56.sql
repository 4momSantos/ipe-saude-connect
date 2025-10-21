-- Migração para corrigir credenciados sem CRMs que não possuem especialidade_id
-- Usa "Clínica Médica" como especialidade padrão

DO $$
DECLARE
  especialidade_padrao UUID;
  registros_inseridos INTEGER := 0;
BEGIN
  -- Buscar ID da especialidade "Clínica Médica"
  SELECT id INTO especialidade_padrao
  FROM especialidades_medicas
  WHERE codigo = 'CLINICA'
  LIMIT 1;
  
  IF especialidade_padrao IS NULL THEN
    RAISE EXCEPTION 'Especialidade padrão "Clínica Médica" não encontrada';
  END IF;
  
  RAISE NOTICE 'Usando especialidade padrão: %', especialidade_padrao;
  
  -- Inserir CRMs faltantes usando especialidade padrão
  WITH credenciados_sem_crm_sem_especialidade AS (
    SELECT 
      c.id as credenciado_id,
      ie.dados_inscricao->'dados_pessoais'->>'crm' as crm,
      ie.dados_inscricao->'dados_pessoais'->>'uf_crm' as uf_crm
    FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    LEFT JOIN credenciado_crms cc ON cc.credenciado_id = c.id
    WHERE c.status = 'Ativo'
      AND cc.id IS NULL
      AND ie.dados_inscricao->'dados_pessoais'->>'crm' IS NOT NULL
      AND ie.dados_inscricao->'dados_pessoais'->>'uf_crm' IS NOT NULL
      AND (ie.dados_inscricao->'dados_pessoais'->>'especialidade_id' IS NULL 
           OR ie.dados_inscricao->'dados_pessoais'->>'especialidade_id' = '')
  )
  INSERT INTO credenciado_crms (
    credenciado_id,
    crm,
    uf_crm,
    especialidade_id,
    especialidade
  )
  SELECT 
    credenciado_id,
    crm,
    uf_crm,
    especialidade_padrao,
    'Clínica Médica'
  FROM credenciados_sem_crm_sem_especialidade;
  
  GET DIAGNOSTICS registros_inseridos = ROW_COUNT;
  
  RAISE NOTICE 'Registros inseridos com especialidade padrão: %', registros_inseridos;
  
END $$;