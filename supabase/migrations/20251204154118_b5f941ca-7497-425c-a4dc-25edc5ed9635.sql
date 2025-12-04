-- Adicionar campos faltantes para adequação ao modelo oficial do contrato IPE Saúde

-- Novos campos para inscricao_consultorios
ALTER TABLE inscricao_consultorios 
ADD COLUMN IF NOT EXISTS municipios_atendimento TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS exames_realizados TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hospitais_vinculados TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tempo_agendamento_consulta VARCHAR(50);

-- Novo campo para inscricoes_edital
ALTER TABLE inscricoes_edital
ADD COLUMN IF NOT EXISTS proa_habilitacao VARCHAR(50);

-- Comentários para documentação
COMMENT ON COLUMN inscricao_consultorios.municipios_atendimento IS 'Municípios onde o profissional atende';
COMMENT ON COLUMN inscricao_consultorios.exames_realizados IS 'Exames/SADTs realizados pelo profissional';
COMMENT ON COLUMN inscricao_consultorios.hospitais_vinculados IS 'Hospitais onde o profissional tem vinculação';
COMMENT ON COLUMN inscricao_consultorios.tempo_agendamento_consulta IS 'Prazo estimado entre agendamento e consulta';
COMMENT ON COLUMN inscricoes_edital.proa_habilitacao IS 'Número do PROA de habilitação';