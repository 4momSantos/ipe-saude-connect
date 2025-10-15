import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ServicoCredenciado {
  servico_id: string;
  credenciado_id: string;
  credenciado_nome: string;
  procedimento_id: string;
  procedimento_nome: string;
  procedimento_codigo: string;
  procedimento_categoria: string;
  especialidade_id: string;
  especialidade_nome: string;
  profissional_id?: string;
  profissional_nome?: string;
  profissional_crm?: string;
  preco_base?: number;
  preco_particular?: number;
  preco_convenio?: number;
  aceita_sus: boolean;
  disponivel: boolean;
  disponivel_online: boolean;
  local_atendimento?: string;
  dias_atendimento?: string[];
  horario_inicio?: string;
  horario_fim?: string;
  observacoes?: string;
  tempo_espera_medio?: number;
}

export function useServicosCredenciado(credenciadoId: string) {
  return useQuery({
    queryKey: ["servicos-credenciado", credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_servicos_por_credenciado" as any, {
        p_credenciado_id: credenciadoId,
      });

      if (error) throw error;
      return data as ServicoCredenciado[];
    },
    enabled: !!credenciadoId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateServicoCredenciado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (servico: {
      credenciado_id: string;
      procedimento_id: string;
      profissional_id?: string;
      preco_base?: number;
      preco_particular?: number;
      preco_convenio?: number;
      aceita_sus?: boolean;
      disponivel_online?: boolean;
      local_atendimento?: string;
      dias_atendimento?: string[];
      horario_inicio?: string;
      horario_fim?: string;
      observacoes?: string;
    }) => {
      const { data, error } = await supabase
        .from("credenciado_servicos" as any)
        .insert(servico)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["servicos-credenciado", variables.credenciado_id] 
      });
      toast.success("Serviço adicionado ao catálogo!");
    },
    onError: (error) => {
      console.error("Erro ao adicionar serviço:", error);
      toast.error("Erro ao adicionar serviço ao catálogo");
    },
  });
}

export function useUpdateServicoCredenciado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: any;
    }) => {
      const { data, error } = await supabase
        .from("credenciado_servicos" as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        queryKey: ["servicos-credenciado", data.credenciado_id] 
      });
      toast.success("Serviço atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar serviço:", error);
      toast.error("Erro ao atualizar serviço");
    },
  });
}

export function useDeleteServicoCredenciado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, credenciado_id }: { id: string; credenciado_id: string }) => {
      const { error } = await supabase
        .from("credenciado_servicos" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, credenciado_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["servicos-credenciado", data.credenciado_id] 
      });
      toast.success("Serviço removido do catálogo!");
    },
    onError: (error) => {
      console.error("Erro ao remover serviço:", error);
      toast.error("Erro ao remover serviço");
    },
  });
}
