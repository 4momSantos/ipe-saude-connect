import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, AtSign, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  link: string;
  lida: boolean;
  prioridade: string;
  criado_em: string;
  dados: any;
}

export function NotificationCenter() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [totalNaoLidas, setTotalNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    carregarNotificacoes();
    const cleanup = setupRealtime();

    return () => {
      cleanup?.();
    };
  }, []);

  const carregarNotificacoes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notificacoes' as any)
        .select('*')
        .eq('usuario_id', user.id)
        .eq('arquivada', false)
        .order('criado_em', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotificacoes((data as any) || []);
      setTotalNaoLidas((data as any)?.filter((n: any) => !n.lida).length || 0);
    } catch (error: any) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const setupRealtime = () => {
    let userId: string;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      userId = user.id;

      const channel = supabase
        .channel(`notificacoes_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificacoes',
            filter: `usuario_id=eq.${userId}`
          },
          (payload) => {
            console.log('Nova notificação:', payload);
            carregarNotificacoes();
            
            // Mostrar toast
            const notif = payload.new as Notificacao;
            toast(notif.titulo, {
              description: notif.descricao
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    let cleanup: (() => void) | undefined;
    init().then(fn => cleanup = fn);

    return () => {
      cleanup?.();
    };
  };

  const marcarComoLida = async (notificacaoId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes' as any)
        .update({ 
          lida: true,
          lida_em: new Date().toISOString()
        } as any)
        .eq('id', notificacaoId);

      if (error) throw error;
      carregarNotificacoes();
    } catch (error: any) {
      toast.error('Erro ao marcar como lida');
    }
  };

  const marcarTodasComoLidas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('notificacoes' as any)
        .update({ 
          lida: true,
          lida_em: new Date().toISOString()
        } as any)
        .eq('usuario_id', user.id)
        .eq('lida', false);

      if (error) throw error;
      carregarNotificacoes();
      
      toast.success('Todas as notificações foram marcadas como lidas');
    } catch (error: any) {
      toast.error('Erro ao marcar todas como lidas');
    }
  };

  const arquivarNotificacao = async (notificacaoId: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes' as any)
        .update({ arquivada: true } as any)
        .eq('id', notificacaoId);

      if (error) throw error;
      carregarNotificacoes();
    } catch (error: any) {
      toast.error('Erro ao arquivar notificação');
    }
  };

  const abrirNotificacao = (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      marcarComoLida(notificacao.id);
    }
    
    if (notificacao.link) {
      setAberto(false);
      navigate(notificacao.link);
    }
  };

  const getIcone = (tipo: string) => {
    switch (tipo) {
      case 'mencao':
        return <AtSign className="w-4 h-4 text-blue-500" />;
      case 'mensagem':
      case 'solicitacao':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'alerta':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {totalNaoLidas > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs"
            >
              {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="font-semibold">Notificações</h3>
            {totalNaoLidas > 0 && (
              <p className="text-sm text-muted-foreground">
                {totalNaoLidas} não lida(s)
              </p>
            )}
          </div>
          
          {totalNaoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={marcarTodasComoLidas}
            >
              <Check className="w-4 h-4 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* Lista de notificações */}
        <ScrollArea className="h-96">
          {notificacoes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-2 text-muted" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            notificacoes.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 border-b hover:bg-muted cursor-pointer ${
                  !notif.lida ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                }`}
                onClick={() => abrirNotificacao(notif)}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getIcone(notif.tipo)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={`text-sm font-medium ${!notif.lida ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                        {notif.titulo}
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          arquivarNotificacao(notif.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    {notif.descricao && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {notif.descricao}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notif.criado_em), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                      
                      {notif.prioridade === 'urgente' && (
                        <Badge variant="destructive" className="text-xs">
                          Urgente
                        </Badge>
                      )}
                      
                      {!notif.lida && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}