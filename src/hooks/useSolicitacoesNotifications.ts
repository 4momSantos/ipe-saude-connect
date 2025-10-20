import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

/**
 * Hook para notificar admins, gestores e analistas sobre novas solicitações de alteração
 */
export function useSolicitacoesNotifications() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Buscar usuário atual
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Verificar se o usuário tem permissão (admin, gestor ou analista)
    const checkUserRole = async (): Promise<boolean> => {
      try {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id);

        if (!userRoles || userRoles.length === 0) return false;

        const roles = userRoles.map(r => r.role);
        const allowedRoles = ['admin', 'gestor', 'analista'];
        return roles.some(role => allowedRoles.includes(role));
      } catch (error) {
        console.error('Erro ao verificar role:', error);
        return false;
      }
    };

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
          // Verificar se o usuário tem permissão
          const hasPermission = await checkUserRole();
          if (!hasPermission) return;

          const solicitacao = payload.new;

          // Não notificar se foi o próprio usuário que criou
          if (solicitacao.user_id === currentUser.id) return;

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
            audio.play().catch(() => {
              // Ignorar erros de reprodução
            });
          } catch (error) {
            // Ignorar erros de áudio
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, navigate]);
}
