import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Profissional {
  id?: string;
  credenciado_id?: string;
  nome: string;
  cpf: string;
  rg?: string;
  data_nascimento?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  crm?: string;
  uf_crm?: string;
  especialidade?: string;
  ativo?: boolean;
  principal?: boolean;
  created_at?: string;
  updated_at?: string;
  credenciado_crms?: Array<{
    id: string;
    crm: string;
    uf_crm: string;
    especialidade: string;
    especialidade_id?: string;
    horarios_atendimento?: Array<{
      id: string;
      dia_semana: string;
      horario_inicio: string;
      horario_fim: string;
    }>;
  }>;
}

export function useProfissionais(credenciadoId?: string) {
  return useQuery({
    queryKey: ["profissionais", credenciadoId],
    queryFn: async () => {
      if (!credenciadoId) return [];

      const { data, error } = await supabase
        .from("profissionais_credenciados" as any)
        .select("*")
        .eq("credenciado_id", credenciadoId)
        .eq("ativo", true)
        .order("principal", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Profissional[];
    },
    enabled: !!credenciadoId,
  });
}

export function useAdicionarProfissional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Profissional>) => {
      const { data: result, error } = await supabase
        .from("profissionais_credenciados" as any)
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result as any;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["profissionais", variables.credenciado_id] });
      queryClient.invalidateQueries({ queryKey: ["credenciado", variables.credenciado_id] });
      toast.success("Profissional adicionado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar profissional: ${error.message}`);
    },
  });
}

export function useEditarProfissional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Profissional> & { id: string }) => {
      const { data: result, error } = await supabase
        .from("profissionais_credenciados" as any)
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result as any;
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["profissionais", result.credenciado_id] });
      queryClient.invalidateQueries({ queryKey: ["credenciado", result.credenciado_id] });
      toast.success("Profissional atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar profissional: ${error.message}`);
    },
  });
}

export function useRemoverProfissional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, credenciadoId }: { id: string; credenciadoId: string }) => {
      const { error } = await supabase
        .from("profissionais_credenciados" as any)
        .update({ ativo: false })
        .eq("id", id);

      if (error) throw error;
      return credenciadoId;
    },
    onSuccess: (credenciadoId) => {
      queryClient.invalidateQueries({ queryKey: ["profissionais", credenciadoId] });
      queryClient.invalidateQueries({ queryKey: ["credenciado", credenciadoId] });
      toast.success("Profissional removido com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover profissional: ${error.message}`);
    },
  });
}
