import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteUserParams {
  userId: string;
  userName: string;
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async ({ userId }: DeleteUserParams) => {
      console.log('[DELETE_USER] Iniciando exclusão do usuário:', userId);

      const { data, error } = await supabase.functions.invoke('delete-user-data', {
        body: { userId }
      });

      if (error) {
        console.error('[DELETE_USER] Erro:', error);
        throw error;
      }

      console.log('[DELETE_USER] Resultado:', data);
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success(`Usuário ${variables.userName} excluído com sucesso`);
      
      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-stats'] });
    },
    onError: (error: any, variables) => {
      console.error('[DELETE_USER] Erro na exclusão:', error);
      toast.error(`Erro ao excluir usuário ${variables.userName}: ${error.message || 'Erro desconhecido'}`);
    },
  });

  return {
    deleteUser: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
