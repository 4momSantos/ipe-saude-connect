import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useAPIKeys() {
  const queryClient = useQueryClient();

  const { data: apiKeys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys_externas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const generateKeyMutation = useMutation({
    mutationFn: async ({ nome, quota_diaria }: { nome: string; quota_diaria: number }) => {
      const { data, error } = await supabase.rpc('gerar_api_key_externa', {
        p_nome: nome,
        p_quota_diaria: quota_diaria,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'API Key gerada',
        description: 'Copie a chave agora, ela não será mostrada novamente.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao gerar API Key',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleKeyMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('api_keys_externas')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'Status atualizado',
        description: 'API Key atualizada com sucesso.',
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys_externas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'API Key removida',
        description: 'A chave foi deletada com sucesso.',
      });
    },
  });

  return {
    apiKeys,
    isLoading,
    generateKey: generateKeyMutation.mutate,
    toggleKey: toggleKeyMutation.mutate,
    deleteKey: deleteKeyMutation.mutate,
  };
}
