import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Credenciado } from "./useCredenciados";

export function useMinhasCredenciacoes() {
  return useQuery({
    queryKey: ["minhas-credenciacoes"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Buscar credenciados vinculados ao candidato através da tabela inscricoes_edital
      const { data: credenciadosData, error: credenciadosError } = await supabase
        .from("credenciados")
        .select(`
          *,
          inscricoes_edital!inner(candidato_id)
        `)
        .eq('inscricoes_edital.candidato_id', user.id)
        .order("created_at", { ascending: false });

      if (credenciadosError) throw credenciadosError;

      // Buscar CRMs para cada credenciado
      const credenciadosComCrms = await Promise.all(
        (credenciadosData || []).map(async (credenciado) => {
          const { data: crmsData } = await supabase
            .from("credenciado_crms")
            .select("crm, especialidade, uf_crm")
            .eq("credenciado_id", credenciado.id);

          return {
            ...credenciado,
            crms: crmsData || [],
          };
        })
      );

      return credenciadosComCrms as Credenciado[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
