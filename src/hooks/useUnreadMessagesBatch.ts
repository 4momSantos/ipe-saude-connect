import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook otimizado para buscar contagens de mensagens não lidas em lote
 * Reduz de N queries para 1 query única + 1 subscription
 */
export function useUnreadMessagesBatch(inscricaoIds: string[]) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchCounts = useCallback(async () => {
    if (inscricaoIds.length === 0) {
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .rpc('get_batch_unread_counts', {
          p_inscricao_ids: inscricaoIds
        });

      if (error) {
        console.error('[UNREAD_BATCH] Erro ao buscar contagens:', error);
        setUnreadCounts({});
      } else {
        const countsMap: Record<string, number> = {};
        data?.forEach((row: { inscricao_id: string; unread_count: number }) => {
          countsMap[row.inscricao_id] = Number(row.unread_count);
        });
        setUnreadCounts(countsMap);
      }
    } catch (error) {
      console.error('[UNREAD_BATCH] Exceção:', error);
    } finally {
      setLoading(false);
    }
  }, [inscricaoIds.join(',')]); // Só refaz se IDs mudarem

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // UMA única subscription para todas as mensagens
  useEffect(() => {
    if (inscricaoIds.length === 0) return;

    const channel = supabase
      .channel('unread-messages-batch')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_messages'
        },
        (payload) => {
          // Só refetch se a mensagem for de uma das inscrições que estamos monitorando
          const msgInscricaoId = (payload.new as any)?.inscricao_id || (payload.old as any)?.inscricao_id;
          if (msgInscricaoId && inscricaoIds.includes(msgInscricaoId)) {
            fetchCounts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoIds.join(','), fetchCounts]);

  return { 
    unreadCounts, 
    loading,
    getCount: (id: string) => unreadCounts[id] || 0,
    refetch: fetchCounts
  };
}
