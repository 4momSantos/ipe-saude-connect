import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SolicitacaoPendente {
  credenciado_id: string;
  count: number;
}

/**
 * Hook para buscar contagem de solicitações pendentes por credenciado
 */
export function useSolicitacoesPendentes() {
  return useQuery({
    queryKey: ['solicitacoes-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitacoes_alteracao')
        .select('credenciado_id')
        .eq('status', 'Pendente');

      if (error) throw error;

      // Agrupar por credenciado_id e contar
      const counts = (data || []).reduce((acc, item) => {
        const id = item.credenciado_id;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return counts;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });
}
