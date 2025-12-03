import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CleanupResult {
  message: string;
  analises_deletadas: number;
  consultorios_deletados: number;
  documentos_deletados: number;
  correcoes_deletadas: number;
  signature_requests_deletadas: number;
  contratos_deletados: number;
  inscricoes_deletadas: number;
  user_roles_deletados: number;
  notifications_deletadas: number;
  profiles_deletados: number;
  auth_users_deletados: number;
  errors: string[];
}

export function useCleanupSeedData() {
  const queryClient = useQueryClient();

  const cleanupMutation = useMutation({
    mutationFn: async (): Promise<CleanupResult> => {
      console.log('[CLEANUP-SEED] Iniciando limpeza de dados seed');

      const { data, error } = await supabase.functions.invoke('cleanup-seed-data', {
        method: 'POST',
      });

      if (error) {
        console.error('[CLEANUP-SEED] Erro:', error);
        throw error;
      }

      console.log('[CLEANUP-SEED] Resultado:', data);
      return data as CleanupResult;
    },
    onSuccess: (result) => {
      const total = 
        result.profiles_deletados + 
        result.inscricoes_deletadas + 
        result.consultorios_deletados;

      if (total === 0) {
        toast.info('Nenhum dado seed encontrado para limpar');
      } else {
        toast.success(
          `Limpeza concluída! ${result.profiles_deletados} usuários, ` +
          `${result.inscricoes_deletadas} inscrições, ` +
          `${result.consultorios_deletados} consultórios removidos.`
        );
      }

      if (result.errors?.length > 0) {
        toast.warning(`${result.errors.length} erros durante a limpeza`);
      }

      // Invalidar caches
      queryClient.invalidateQueries({ queryKey: ['inscricoes'] });
      queryClient.invalidateQueries({ queryKey: ['credenciados'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
    onError: (error: any) => {
      console.error('[CLEANUP-SEED] Erro na limpeza:', error);
      toast.error(`Erro ao limpar dados seed: ${error.message || 'Erro desconhecido'}`);
    },
  });

  return {
    cleanup: cleanupMutation.mutate,
    isLoading: cleanupMutation.isPending,
    result: cleanupMutation.data,
  };
}
