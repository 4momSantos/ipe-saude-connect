-- Ensure especialidade_id can be NULL to allow generic CRM entries
ALTER TABLE credenciado_crms ALTER COLUMN especialidade_id DROP NOT NULL;