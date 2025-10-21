-- Migração para corrigir credenciados sem CRMs vinculados
-- Identifica credenciados ativos sem registros em credenciado_crms
-- e insere os dados extraídos de inscricoes_edital.dados_inscricao
-- APENAS para aqueles que possuem especialidade_id válido

DO $$
DECLARE
  credenciados_sem_crm INTEGER;
  registros_inseridos INTEGER := 0;
BEGIN
  -- Contar credenciados sem CRM antes da correção
  SELECT COUNT(DISTINCT c.id) INTO credenciados_sem_crm
  FROM credenciados c
  JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
  LEFT JOIN credenciado_crms cc ON cc.credenciado_id = c.id
  WHERE c.status = 'Ativo'
    AND cc.id IS NULL
    AND ie.dados_inscricao->'dados_pessoais'->>'crm' IS NOT NULL;
  
  RAISE NOTICE 'Credenciados sem CRM encontrados: %', credenciados_sem_crm;
  
  -- Inserir CRMs faltantes (apenas com especialidade_id válido)
  WITH credenciados_sem_crm AS (
    SELECT 
      c.id as credenciado_id,
      ie.dados_inscricao->'dados_pessoais'->>'crm' as crm,
      ie.dados_inscricao->'dados_pessoais'->>'uf_crm' as uf_crm,
      ie.dados_inscricao->'dados_pessoais'->>'especialidade_id' as especialidade_id_text,
      ie.dados_inscricao->'dados_pessoais'->>'especialidade' as especialidade_nome
    FROM credenciados c
    JOIN inscricoes_edital ie ON ie.id = c.inscricao_id
    LEFT JOIN credenciado_crms cc ON cc.credenciado_id = c.id
    WHERE c.status = 'Ativo'
      AND cc.id IS NULL
      AND ie.dados_inscricao->'dados_pessoais'->>'crm' IS NOT NULL
      AND ie.dados_inscricao->'dados_pessoais'->>'uf_crm' IS NOT NULL
      AND ie.dados_inscricao->'dados_pessoais'->>'especialidade_id' IS NOT NULL
      AND ie.dados_inscricao->'dados_pessoais'->>'especialidade_id' != ''
  ),
  dados_com_especialidade AS (
    SELECT 
      csc.credenciado_id,
      csc.crm,
      csc.uf_crm,
      csc.especialidade_id_text::uuid as especialidade_id,
      COALESCE(em.nome, csc.especialidade_nome, 'Não especificada') as especialidade_nome
    FROM credenciados_sem_crm csc
    LEFT JOIN especialidades_medicas em ON em.id = csc.especialidade_id_text::uuid
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
    especialidade_id,
    especialidade_nome
  FROM dados_com_especialidade;
  
  GET DIAGNOSTICS registros_inseridos = ROW_COUNT;
  
  RAISE NOTICE 'Registros inseridos em credenciado_crms: %', registros_inseridos;
  
  -- Verificar credenciados sem CRM após a correção
  SELECT COUNT(DISTINCT c.id) INTO credenciados_sem_crm
  FROM credenciados c
  LEFT JOIN credenciado_crms cc ON cc.credenciado_id = c.id
  WHERE c.status = 'Ativo'
    AND cc.id IS NULL;
  
  RAISE NOTICE 'Credenciados sem CRM após correção: %', credenciados_sem_crm;
  
END $$;