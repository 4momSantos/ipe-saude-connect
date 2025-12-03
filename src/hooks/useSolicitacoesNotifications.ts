import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook para notificar admins, gestores e analistas sobre novas solicitações de alteração
 * Otimizado para usar useAuth() centralizado em vez de chamadas diretas
 */
export function useSolicitacoesNotifications() {
  const navigate = useNavigate();
  const { user, roles } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Verificar se o usuário tem permissão diretamente do contexto
    const allowedRoles = ['admin', 'gestor', 'analista'];
    const hasPermission = roles.some(role => allowedRoles.includes(role));
    if (!hasPermission) return;

    // Configurar listener para novas solicitações
    const channel = supabase
      .channel('solicitacoes-alteracao-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'solicitacoes_alteracao',
        },
        async (payload) => {
          const solicitacao = payload.new;

          // Não notificar se foi o próprio usuário que criou
          if (solicitacao.user_id === user.id) return;

          // Buscar dados do credenciado
          const { data: credenciado } = await supabase
            .from('credenciados')
            .select('nome, numero_credenciado')
            .eq('id', solicitacao.credenciado_id)
            .single();

          // Exibir notificação
          toast.info(
            `Nova Solicitação de Alteração: ${credenciado?.nome || 'Credenciado'} - ${solicitacao.tipo_alteracao}`,
            {
              duration: 8000,
              action: {
                label: 'Ver',
                onClick: () => navigate(`/credenciados/${solicitacao.credenciado_id}`),
              },
            }
          );

          // Opcional: reproduzir som de notificação
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch {
            // Ignorar erros de áudio
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roles, navigate]);
}
