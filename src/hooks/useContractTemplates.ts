import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContractTemplate } from "@/types/contract-editor";

export function useContractTemplates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["contract-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        campos_mapeados: (t.campos_mapeados as any) || []
      })) as ContractTemplate[];
    }
  });

  const criarMutation = useMutation({
    mutationFn: async (template: Partial<ContractTemplate>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("contract_templates")
        .insert({
          nome: template.nome!,
          descricao: template.descricao,
          conteudo_html: template.conteudo_html!,
          campos_mapeados: (template.campos_mapeados || []) as any,
          is_active: template.is_active ?? true,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template criado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Erro ao criar template:", error);
      toast.error("Erro ao criar template: " + error.message);
    }
  });

  const editarMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContractTemplate> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updateData.campos_mapeados) {
        updateData.campos_mapeados = updateData.campos_mapeados as any;
      }
      delete updateData.id;
      
      const { data, error } = await supabase
        .from("contract_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template atualizado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Erro ao atualizar template:", error);
      toast.error("Erro ao atualizar template: " + error.message);
    }
  });

  const deletarMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template deletado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Erro ao deletar template:", error);
      toast.error("Erro ao deletar template: " + error.message);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("contract_templates")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Status do template atualizado!");
    }
  });

  return {
    templates: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    criar: criarMutation.mutateAsync,
    editar: editarMutation.mutateAsync,
    deletar: deletarMutation.mutateAsync,
    toggleActive: toggleActiveMutation.mutateAsync,
    isCriando: criarMutation.isPending,
    isEditando: editarMutation.isPending,
    isDeletando: deletarMutation.isPending
  };
}

export function useContractTemplate(id?: string) {
  return useQuery({
    queryKey: ["contract-templates", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return {
        ...data,
        campos_mapeados: (data.campos_mapeados as any) || []
      } as ContractTemplate;
    },
    enabled: !!id
  });
}
