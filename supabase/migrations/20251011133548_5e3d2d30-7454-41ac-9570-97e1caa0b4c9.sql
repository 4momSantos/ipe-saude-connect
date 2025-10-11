-- FASE 1: Adicionar coluna uploads_config à tabela editais
ALTER TABLE editais 
ADD COLUMN uploads_config JSONB DEFAULT NULL;

COMMENT ON COLUMN editais.uploads_config IS 
'Configuração de uploads obrigatórios/opcionais por edital. 
Se NULL, usa a configuração do inscription_template. 
Formato: { "ficha_cadastral": { "obrigatorio": true, "habilitado": true, "label": "Label customizado" }, ... }';

-- FASE 7: Migração de dados existentes - Inicializar com valores padrão
UPDATE editais
SET uploads_config = '{
  "ficha_cadastral": {"obrigatorio": true, "habilitado": true, "label": "Ficha cadastral preenchida, datada e assinada"},
  "identidade_medica": {"obrigatorio": true, "habilitado": true, "label": "Carteira de identidade médica (frente e verso)"},
  "cert_regularidade_pj": {"obrigatorio": true, "habilitado": true, "label": "Certificado de Regularidade PJ no CREMERS"},
  "registro_especialidade": {"obrigatorio": true, "habilitado": true, "label": "Registro de Especialidade no CREMERS"},
  "alvara_sanitario": {"obrigatorio": true, "habilitado": true, "label": "Alvará Sanitário e de Localização"},
  "cnpj": {"obrigatorio": true, "habilitado": true, "label": "Prova de inscrição no CNPJ"},
  "certidoes_negativas": {"obrigatorio": true, "habilitado": true, "label": "Certidões Negativas (Federal, Estadual, Municipal)"},
  "cert_fgts": {"obrigatorio": true, "habilitado": true, "label": "Certificado de Regularidade do FGTS"},
  "comp_bancario": {"obrigatorio": true, "habilitado": true, "label": "Comprovante de conta bancária (Banrisul)"},
  "contrato_social": {"obrigatorio": false, "habilitado": true, "label": "Contrato Social da Pessoa Jurídica (última alteração)"},
  "rg_cpf": {"obrigatorio": false, "habilitado": true, "label": "RG e CPF (se não constarem na identidade médica)"},
  "simples_nacional": {"obrigatorio": false, "habilitado": false, "label": "Comprovante Simples Nacional (se optante)"},
  "doc_exames": {"obrigatorio": false, "habilitado": false, "label": "Documentos opcionais para exames"}
}'::jsonb
WHERE uploads_config IS NULL;