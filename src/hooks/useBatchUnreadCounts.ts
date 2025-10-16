import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook otimizado para buscar contagens de mensagens não lidas em lote
 * Reduz de N queries para 1 query única
 */
export function useBatchUnreadCounts(inscricaoIds: string[]) {
  return useQuery({
    queryKey: ['batch-unread-counts', inscricaoIds],
    queryFn: async () => {
      if (inscricaoIds.length === 0) return {};
      
      const { data, error } = await supabase
        .rpc('get_batch_unread_counts', {
          p_inscricao_ids: inscricaoIds
        });
      
      if (error) {
        console.error('Erro ao buscar contagens:', error);
        return {};
      }
      
      // Converter array para objeto { inscricaoId: count }
      const countsMap: Record<string, number> = {};
      data?.forEach((row: any) => {
        countsMap[row.inscricao_id] = parseInt(row.unread_count);
      });
      
      return countsMap;
    },
    enabled: inscricaoIds.length > 0,
    staleTime: 30000, // 30s cache
    refetchInterval: 60000, // Refetch a cada 1min
  });
}
