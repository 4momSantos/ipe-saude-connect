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
      console.log('[DEBUG] Iniciando edição do template:', id);
      console.log('[DEBUG] Dados a atualizar:', {
        nome: updates.nome,
        tamanho_html: updates.conteudo_html?.length,
        num_campos: (updates.campos_mapeados as any)?.length
      });

      const updateData: any = { ...updates };
      if (updateData.campos_mapeados) {
        // Validar tamanho do JSONB (PostgreSQL limita a ~1GB, mas ideal é < 1MB)
        const jsonSize = JSON.stringify(updateData.campos_mapeados).length;
        console.log('[DEBUG] Tamanho JSON campos_mapeados:', jsonSize, 'bytes');
        
        if (jsonSize > 1000000) { // 1MB
          throw new Error('Campos mapeados excedem 1MB. Reduza a quantidade de placeholders.');
        }
        
        updateData.campos_mapeados = updateData.campos_mapeados as any;
      }
      delete updateData.id;
      
      const { data, error } = await supabase
        .from("contract_templates")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error('[ERROR] Erro do Supabase:', error);
        throw error;
      }
      
      console.log('[DEBUG] Template atualizado com sucesso!');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract-templates"] });
      toast.success("Template atualizado com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Erro ao atualizar template:", error);
      console.error("Stack:", error.stack);
      
      // Mostrar erro mais descritivo
      let errorMessage = error.message;
      if (error.message.includes('row is too big')) {
        errorMessage = 'Conteúdo do template é muito grande. Reduza o tamanho do HTML ou número de placeholders.';
      } else if (error.message.includes('permission denied')) {
        errorMessage = 'Você não tem permissão para editar este template.';
      } else if (error.message.includes('connection')) {
        errorMessage = 'Erro de conexão com o banco de dados. Verifique sua internet.';
      }
      
      toast.error("Erro ao atualizar template: " + errorMessage);
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
