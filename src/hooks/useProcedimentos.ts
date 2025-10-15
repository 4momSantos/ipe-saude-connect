import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Procedimento {
  id: string;
  nome: string;
  codigo_tuss: string;
  descricao?: string;
  especialidade_id?: string;
  categoria: string;
  tipo: string;
  duracao_media?: number;
  complexidade?: string;
  ativo: boolean;
}

export function useProcedimentos(especialidadeId?: string) {
  return useQuery({
    queryKey: ["procedimentos", especialidadeId],
    queryFn: async () => {
      let query = supabase
        .from("procedimentos" as any)
        .select("*")
        .eq("ativo", true)
        .order("nome");

      if (especialidadeId) {
        query = query.eq("especialidade_id", especialidadeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as Procedimento[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
