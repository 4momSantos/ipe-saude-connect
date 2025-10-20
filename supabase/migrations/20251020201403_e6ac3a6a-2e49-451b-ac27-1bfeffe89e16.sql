-- Correção 1: Atualizar e-mail do Arthur Santos especificamente
UPDATE inscricoes_edital
SET dados_inscricao = jsonb_set(
  COALESCE(dados_inscricao, '{}'::jsonb),
  '{dados_pessoais, email}',
  '"arthur.silva@dxmconsultoria.com.br"'::jsonb
)
WHERE id = '150c03f2-8caa-4037-9143-eb5b15a19de0'
  AND (dados_inscricao->'dados_pessoais'->>'email' IS NULL 
       OR dados_inscricao->'dados_pessoais'->>'email' = '');

-- Correção 2: Atualizar todas as inscrições sem e-mail usando o e-mail do profile
UPDATE inscricoes_edital ie
SET dados_inscricao = jsonb_set(
  COALESCE(ie.dados_inscricao, '{}'::jsonb),
  '{dados_pessoais, email}',
  to_jsonb(p.email)
)
FROM profiles p
WHERE ie.candidato_id = p.id
  AND (ie.dados_inscricao->'dados_pessoais'->>'email' IS NULL 
       OR ie.dados_inscricao->'dados_pessoais'->>'email' = '')
  AND p.email IS NOT NULL
  AND p.email != '';

-- Log de quantas inscrições foram corrigidas
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM inscricoes_edital ie
  JOIN profiles p ON p.id = ie.candidato_id
  WHERE ie.dados_inscricao->'dados_pessoais'->>'email' IS NOT NULL
    AND p.email IS NOT NULL;
  
  RAISE NOTICE '[EMAIL_FIX] % inscrições agora possuem e-mail válido', v_count;
END $$;