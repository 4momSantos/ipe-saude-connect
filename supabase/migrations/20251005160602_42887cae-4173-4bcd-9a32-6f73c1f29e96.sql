-- Atualizar política RLS para garantir que candidatos só vejam editais publicados/abertos
DROP POLICY IF EXISTS "Visualização de editais baseada em role" ON editais;

CREATE POLICY "Visualização de editais baseada em role"
ON editais
FOR SELECT
USING (
  has_role(auth.uid(), 'gestor'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'analista'::app_role)
  OR (
    has_role(auth.uid(), 'candidato'::app_role) 
    AND status IN ('publicado', 'aberto') -- ✅ EXPLÍCITO NO RLS
  )
);