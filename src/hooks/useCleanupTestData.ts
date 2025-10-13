import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CleanupResult {
  message: string;
  credenciados_deletados: number;
  inscricoes_deletadas: number;
  documentos_deletados: number;
  contratos_deletados: number;
  assinaturas_deletadas: number;
}

export function useCleanupTestData() {
  const queryClient = useQueryClient();

  const cleanupMutation = useMutation({
    mutationFn: async (): Promise<CleanupResult> => {
      console.log('[CLEANUP] Iniciando limpeza de dados de teste');

      const { data, error } = await supabase.functions.invoke('cleanup-test-data', {
        method: 'POST',
      });

      if (error) {
        console.error('[CLEANUP] Erro:', error);
        throw error;
      }

      console.log('[CLEANUP] Resultado:', data);
      return data as CleanupResult;
    },
    onSuccess: (result) => {
      const total = result.credenciados_deletados + 
                   result.inscricoes_deletadas + 
                   result.documentos_deletados + 
                   result.contratos_deletados + 
                   result.assinaturas_deletadas;

      if (total === 0) {
        toast.info('Nenhum dado de teste encontrado para limpar');
      } else {
        toast.success(
          `Limpeza concluída! ${result.inscricoes_deletadas} inscrições, ` +
          `${result.credenciados_deletados} credenciados, ` +
          `${result.documentos_deletados} documentos, ` +
          `${result.contratos_deletados} contratos e ` +
          `${result.assinaturas_deletadas} assinaturas removidos.`
        );
      }

      // Invalidar caches relacionados
      queryClient.invalidateQueries({ queryKey: ['inscricoes'] });
      queryClient.invalidateQueries({ queryKey: ['credenciados'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      console.error('[CLEANUP] Erro na limpeza:', error);
      toast.error(`Erro ao limpar dados de teste: ${error.message || 'Erro desconhecido'}`);
    },
  });

  return {
    cleanup: cleanupMutation.mutate,
    isLoading: cleanupMutation.isPending,
    result: cleanupMutation.data,
  };
}
