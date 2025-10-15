import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useFiltroOptions() {
  const { data: especialidades = [], isLoading: loadingEsp } = useQuery({
    queryKey: ["filtro-especialidades"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credenciado_crms")
        .select("especialidade")
        .not("especialidade", "is", null);
      
      return [...new Set(data?.map(d => d.especialidade).filter(Boolean) || [])].sort();
    },
  });

  const { data: estados = [], isLoading: loadingEstados } = useQuery({
    queryKey: ["filtro-estados"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credenciados")
        .select("estado")
        .not("estado", "is", null);
      
      return [...new Set(data?.map(d => d.estado).filter(Boolean) || [])].sort();
    },
  });

  const { data: cidadesPorEstado = [], isLoading: loadingCidades } = useQuery({
    queryKey: ["filtro-cidades"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credenciados")
        .select("cidade, estado")
        .not("cidade", "is", null)
        .not("estado", "is", null);
      
      return data || [];
    },
  });

  const { data: ufsCrm = [], isLoading: loadingUfs } = useQuery({
    queryKey: ["filtro-ufs-crm"],
    queryFn: async () => {
      const { data } = await supabase
        .from("credenciado_crms")
        .select("uf_crm")
        .not("uf_crm", "is", null);
      
      return [...new Set(data?.map(d => d.uf_crm).filter(Boolean) || [])].sort();
    },
  });

  return {
    especialidades,
    estados,
    cidadesPorEstado,
    ufsCrm,
    isLoading: loadingEsp || loadingEstados || loadingCidades || loadingUfs,
  };
}
