-- Remove constraint that requires especialidade_id to be NOT NULL
-- This allows creating generic CRM entries without a specific specialty
ALTER TABLE credenciado_crms DROP CONSTRAINT IF EXISTS credenciado_crms_especialidade_id_not_null;