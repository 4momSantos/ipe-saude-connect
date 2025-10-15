import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MessageCircle } from 'lucide-react';

export function useGlobalMessageNotifications() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Buscar usuário atual
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    
    loadUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Verificar role do usuário para determinar visibilidade
    const checkUserRole = async (visivelPara: string[]): Promise<boolean> => {
      if (visivelPara?.includes('todos')) return true;

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id);

      return roles?.some(r => visivelPara?.includes(r.role)) || false;
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
          if (newMessage.sender_id === currentUser.id) return;

          // Verificar se usuário tem permissão para ver a mensagem
          const canView = await checkUserRole(newMessage.visivel_para || ['todos']);
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
            audio.play().catch(() => {
              // Ignorar erro se som não estiver disponível
            });
          } catch (e) {
            // Som opcional, não bloqueia se falhar
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, navigate]);
}
