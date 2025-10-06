-- Adicionar foreign key de inscricoes_edital.candidato_id para profiles.id
-- Isso permite queries corretas de nome e email dos candidatos
ALTER TABLE public.inscricoes_edital 
ADD CONSTRAINT inscricoes_edital_candidato_profile_fkey 
FOREIGN KEY (candidato_id) 
REFERENCES public.profiles(id) ON DELETE CASCADE;