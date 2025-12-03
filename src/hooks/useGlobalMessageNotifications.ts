import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useGlobalMessageNotifications() {
  const { user, roles } = useAuth(); // ✅ Usar contexto
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    // ✅ Verificar role usando dados do contexto
    const checkUserRole = (visivelPara: string[]): boolean => {
      if (visivelPara?.includes('todos')) return true;
      return roles.some(r => visivelPara?.includes(r));
    };

    // Subscription para novas mensagens
    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_messages',
        },
        async (payload) => {
          const newMessage = payload.new as any;

          // Não notificar sobre próprias mensagens
          if (newMessage.sender_id === user.id) return;

          // Verificar se usuário tem permissão para ver a mensagem
          const canView = checkUserRole(newMessage.visivel_para || ['todos']);
          if (!canView) return;

          // Mostrar toast com preview
          toast(newMessage.usuario_nome || 'Nova mensagem', {
            description: newMessage.mensagem || newMessage.content,
            action: {
              label: 'Ver',
              onClick: () => {
                navigate(`/analises?inscricao=${newMessage.inscricao_id}`);
              },
            },
            duration: 5000,
          });

          // Som de notificação (opcional)
          try {
            const audio = new Audio('/sounds/notification.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, roles, navigate]);
}
