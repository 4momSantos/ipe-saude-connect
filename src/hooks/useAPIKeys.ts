import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface APIKey {
  id: string;
  nome: string;
  key_hash: string;
  key_prefix: string;
  quota_diaria: number;
  requisicoes_hoje: number;
  ativo: boolean;
  criada_em: string;
}

export function useAPIKeys() {
  const queryClient = useQueryClient();

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys_externas' as any)
        .select('*')
        .order('criada_em', { ascending: false });

      if (error) throw error;
      return (data || []) as APIKey[];
    }
  });

  const generateKeyMutation = useMutation({
    mutationFn: async ({ nome, quota }: { nome: string; quota: number }) => {
      const { data, error } = await supabase.rpc('gerar_api_key_externa' as any, {
        p_nome: nome,
        p_quota_diaria: quota
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success("API Key gerada com sucesso");
    },
    onError: () => toast.error("Erro ao gerar API Key")
  });

  const toggleKeyMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('api_keys_externas' as any)
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status")
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys_externas' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success("API Key removida");
    },
    onError: () => toast.error("Erro ao remover API Key")
  });

  return {
    keys: keys || [],
    isLoading,
    generateKey: generateKeyMutation.mutate,
    toggleKey: toggleKeyMutation.mutate,
    deleteKey: deleteKeyMutation.mutate
  };
}
