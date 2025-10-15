import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Credenciado } from "./useCredenciados";

export function useCredenciadosFiltrados(editalId?: string) {
  return useQuery({
    queryKey: ["credenciados-filtrados", editalId],
    queryFn: async () => {
      if (!editalId) {
        // Se não há edital, retornar todos os credenciados ativos
        const { data: credenciadosData, error: credenciadosError } = await supabase
          .from("credenciados")
          .select("*")
          .eq("status", "Ativo")
          .order("created_at", { ascending: false });

        if (credenciadosError) throw credenciadosError;

        // Buscar CRMs e profissionais para cada credenciado
        const credenciadosComCrms = await Promise.all(
          (credenciadosData || []).map(async (credenciado) => {
            const { data: crmsData } = await supabase
              .from("credenciado_crms")
              .select(`
                crm, 
                especialidade, 
                uf_crm,
                especialidade_id,
                especialidades_medicas:especialidade_id (
                  id,
                  nome,
                  codigo
                )
              `)
              .eq("credenciado_id", credenciado.id);

            // Se for CNPJ, buscar profissionais vinculados
            let profissionaisData = null;
            if (credenciado.cnpj) {
              const { data } = await supabase
                .from("profissionais_credenciados" as any)
                .select("*")
                .eq("credenciado_id", credenciado.id)
                .eq("ativo", true);
              profissionaisData = data;
            }

            return {
              ...credenciado,
              crms: crmsData || [],
              profissionais: profissionaisData || [],
            };
          })
        );

        return credenciadosComCrms as Credenciado[];
      }

      // Buscar especialidades do edital
      const { data: especialidadesEdital, error: especialidadesError } = await supabase
        .from("edital_especialidades")
        .select("especialidade_id")
        .eq("edital_id", editalId);

      if (especialidadesError) throw especialidadesError;

      const especialidadeIds = especialidadesEdital?.map((e) => e.especialidade_id) || [];

      if (especialidadeIds.length === 0) {
        return [];
      }

      // Buscar CRMs que possuem essas especialidades
      const { data: crmsComEspecialidade, error: crmsError } = await supabase
        .from("credenciado_crms")
        .select("credenciado_id")
        .in("especialidade_id", especialidadeIds);

      if (crmsError) throw crmsError;

      const credenciadoIds = [
        ...new Set(crmsComEspecialidade?.map((c) => c.credenciado_id)),
      ];

      if (credenciadoIds.length === 0) {
        return [];
      }

      // Buscar credenciados filtrados
      const { data: credenciadosData, error: credenciadosError } = await supabase
        .from("credenciados")
        .select("*")
        .in("id", credenciadoIds)
        .eq("status", "Ativo")
        .order("created_at", { ascending: false });

      if (credenciadosError) throw credenciadosError;

      // Buscar CRMs e profissionais para cada credenciado
      const credenciadosComCrms = await Promise.all(
        (credenciadosData || []).map(async (credenciado) => {
          const { data: crmsData } = await supabase
            .from("credenciado_crms")
            .select(`
              crm, 
              especialidade, 
              uf_crm,
              especialidade_id,
              especialidades_medicas:especialidade_id (
                id,
                nome,
                codigo
              )
            `)
            .eq("credenciado_id", credenciado.id);

          // Se for CNPJ, buscar profissionais vinculados
          let profissionaisData = null;
          if (credenciado.cnpj) {
            const { data } = await supabase
              .from("profissionais_credenciados" as any)
              .select("*")
              .eq("credenciado_id", credenciado.id)
              .eq("ativo", true);
            profissionaisData = data;
          }

          return {
            ...credenciado,
            crms: crmsData || [],
            profissionais: profissionaisData || [],
          };
        })
      );

      return credenciadosComCrms as Credenciado[];
    },
    enabled: true,
  });
}
