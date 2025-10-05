import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Especialidade {
  id: string;
  nome: string;
  codigo: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export function useEspecialidades() {
  return useQuery({
    queryKey: ["especialidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("especialidades_medicas")
        .select("*")
        .eq("ativa", true)
        .order("nome");

      if (error) throw error;
      return data as Especialidade[];
    },
  });
}

export function useCreateEspecialidade() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from("especialidades_medicas")
        .insert([{ nome }])
        .select()
        .single();

      if (error) throw error;
      return data as Especialidade;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["especialidades"] });
    },
  });
}
