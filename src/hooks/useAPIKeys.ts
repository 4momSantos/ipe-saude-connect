// FASE 6.2: Hook - API Keys Externas
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
  ultima_requisicao: string | null;
  ativo: boolean;
  ip_whitelist: string[] | null;
  created_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export function useAPIKeys() {
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys-externas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys_externas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as APIKey[];
    }
  });

  const createAPIKeyMutation = useMutation({
    mutationFn: async ({ nome, quota_diaria }: { nome: string; quota_diaria?: number }) => {
      const { data, error } = await supabase.rpc('gerar_api_key_externa', {
        p_nome: nome,
        p_quota_diaria: quota_diaria || 1000
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: (apiKey) => {
      queryClient.invalidateQueries({ queryKey: ['api-keys-externas'] });
      
      // Copiar para clipboard
      navigator.clipboard.writeText(apiKey);
      
      toast.success("API Key criada e copiada para clipboard", {
        description: "Esta é a única vez que você verá esta key. Guarde-a em local seguro."
      });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar API Key: ${error.message}`);
    }
  });

  const updateAPIKeyMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<APIKey> }) => {
      const { error } = await supabase
        .from('api_keys_externas')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys-externas'] });
      toast.success("API Key atualizada com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar API Key: ${error.message}`);
    }
  });

  const deleteAPIKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys_externas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys-externas'] });
      toast.success("API Key removida com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover API Key: ${error.message}`);
    }
  });

  return {
    apiKeys: apiKeys || [],
    isLoading,
    createAPIKey: createAPIKeyMutation.mutateAsync,
    updateAPIKey: updateAPIKeyMutation.mutate,
    deleteAPIKey: deleteAPIKeyMutation.mutate,
    isCriando: createAPIKeyMutation.isPending
  };
}
