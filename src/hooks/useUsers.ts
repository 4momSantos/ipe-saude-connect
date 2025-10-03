import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserWithRoles {
  id: string;
  email: string;
  nome: string | null;
  telefone: string | null;
  created_at: string;
  roles: string[];
}

export function useUsers() {
  const queryClient = useQueryClient();

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, nome, telefone, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles: UserWithRoles[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id);

          return {
            ...profile,
            roles: rolesData?.map(r => r.role) || [],
          };
        })
      );

      return usersWithRoles;
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserWithRoles> }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar usuário: ' + error.message);
    },
  });

  return {
    users,
    isLoading,
    error,
    updateProfile: updateProfile.mutate,
  };
}

export function useUserStats() {
  return useQuery({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, created_at');

      if (error) throw error;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role');

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const newUsers = profiles?.filter(
        p => new Date(p.created_at) > thirtyDaysAgo
      ).length || 0;

      const roleCount = {
        candidato: 0,
        analista: 0,
        gestor: 0,
        admin: 0,
      };

      roles?.forEach(r => {
        if (r.role in roleCount) {
          roleCount[r.role as keyof typeof roleCount]++;
        }
      });

      return {
        total: profiles?.length || 0,
        newUsers,
        roleCount,
      };
    },
  });
}
