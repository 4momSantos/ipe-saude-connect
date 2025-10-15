import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUnreadMessages(inscricaoId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!inscricaoId) {
      setLoading(false);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Contar mensagens não lidas (usando is_read do hook useWorkflowMessages)
        const { count, error } = await supabase
          .from('workflow_messages')
          .select('*', { count: 'exact', head: true })
          .eq('inscricao_id', inscricaoId)
          .eq('is_read', false)
          .neq('sender_id', user.id); // Não contar próprias mensagens

        if (!error) {
          setUnreadCount(count || 0);
        }
      } catch (error) {
        console.error('[useUnreadMessages] Erro ao buscar contagem:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Realtime subscription para atualizar contador automaticamente
    const channel = supabase
      .channel(`unread-messages-${inscricaoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_messages',
          filter: `inscricao_id=eq.${inscricaoId}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId]);

  return { unreadCount, loading };
}
