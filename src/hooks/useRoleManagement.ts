import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserRole } from './useUserRole';

export function useRoleManagement() {
  const queryClient = useQueryClient();

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data: currentUser } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role,
          created_by: currentUser.user?.id,
        });

      if (error) {
        // Check if role already exists
        if (error.code === '23505') {
          throw new Error('Usuário já possui essa role');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role atribuída com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atribuir role');
    },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { data: currentUser } = await supabase.auth.getUser();

      // Prevent admin from removing their own admin role
      if (currentUser.user?.id === userId && role === 'admin') {
        throw new Error('Você não pode remover sua própria role de admin');
      }

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role removida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao remover role');
    },
  });

  return {
    assignRole: assignRole.mutate,
    removeRole: removeRole.mutate,
    isAssigning: assignRole.isPending,
    isRemoving: removeRole.isPending,
  };
}
