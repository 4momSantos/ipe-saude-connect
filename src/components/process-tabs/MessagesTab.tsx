import { useState, useEffect, useRef } from "react";
import { Send, User, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  sender_id: string;
  sender_type: "analista" | "candidato" | "sistema";
  content: string;
  created_at: string;
  is_read: boolean;
  sender_name?: string;
}

interface MessagesTabProps {
  processoId: string;
  candidatoNome: string;
  executionId?: string;
  inscricaoId: string;
}

export function MessagesTab({ processoId, candidatoNome, executionId, inscricaoId }: MessagesTabProps) {
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserType, setCurrentUserType] = useState<"analista" | "candidato">("candidato");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCurrentUser();
    loadMessages();
    
    // Realtime subscription
    const channel = supabase
      .channel(`messages:${inscricaoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_messages',
          filter: `inscricao_id=eq.${inscricaoId}`
        },
        (payload) => {
          console.log('Realtime message:', payload);
          if (payload.eventType === 'INSERT') {
            loadMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId]);

  useEffect(() => {
    scrollToBottom();
    markMessagesAsRead();
  }, [mensagens]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      
      // Verificar se é analista
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const isAnalista = roles?.some(r => r.role === 'analista' || r.role === 'gestor' || r.role === 'admin');
      setCurrentUserType(isAnalista ? 'analista' : 'candidato');
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('workflow_messages')
        .select(`
          *,
          profiles:sender_id (nome, email)
        `)
        .eq('inscricao_id', inscricaoId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        sender_type: msg.sender_type,
        content: msg.content,
        created_at: msg.created_at,
        is_read: msg.is_read,
        sender_name: msg.profiles?.nome || msg.profiles?.email || 'Usuário'
      }));

      setMensagens(formattedMessages);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!currentUserId) return;

    try {
      // Marcar mensagens não lidas que não são do usuário atual
      const unreadMessages = mensagens.filter(
        m => !m.is_read && m.sender_id !== currentUserId
      );

      if (unreadMessages.length > 0) {
        await supabase
          .from('workflow_messages')
          .update({ is_read: true })
          .in('id', unreadMessages.map(m => m.id));
      }
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  };

  const handleEnviar = async () => {
    if (!novaMensagem.trim() || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('workflow_messages')
        .insert({
          execution_id: executionId,
          inscricao_id: inscricaoId,
          sender_id: currentUserId,
          sender_type: currentUserType,
          content: novaMensagem.trim(),
        });

      if (error) throw error;

      setNovaMensagem("");
      toast.success('Mensagem enviada!');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-sm text-muted-foreground animate-pulse">Carregando mensagens...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Lista de mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-muted-foreground mb-2">Nenhuma mensagem ainda</div>
            <div className="text-sm text-muted-foreground">
              Envie a primeira mensagem para iniciar a conversa
            </div>
          </div>
        ) : (
          mensagens.map((mensagem) => {
            const isOwnMessage = mensagem.sender_id === currentUserId;
            const isSistema = mensagem.sender_type === 'sistema';
            
            return (
              <div
                key={mensagem.id}
                className={`flex gap-3 ${
                  isOwnMessage ? "justify-end" : "justify-start"
                }`}
              >
                {!isOwnMessage && !isSistema && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <Card
                  className={`max-w-[70%] p-3 ${
                    isSistema
                      ? "bg-muted/50 border-dashed"
                      : isOwnMessage
                      ? "bg-primary/10"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">
                      {isSistema ? 'Sistema' : mensagem.sender_name}
                    </span>
                    {mensagem.sender_type && (
                      <Badge variant="outline" className="text-xs px-1 py-0">
                        {mensagem.sender_type === 'analista' ? 'Analista' : 
                         mensagem.sender_type === 'candidato' ? 'Candidato' : 'Sistema'}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(mensagem.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{mensagem.content}</p>
                </Card>
                {isOwnMessage && !isSistema && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-accent/10 text-accent-foreground">
                      <UserCircle className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de nova mensagem */}
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            value={novaMensagem}
            onChange={(e) => setNovaMensagem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleEnviar();
              }
            }}
            placeholder="Digite sua mensagem..."
            className="min-h-[80px] resize-none bg-background"
          />
          <Button
            onClick={handleEnviar}
            disabled={!novaMensagem.trim()}
            className="px-6"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Pressione Enter para enviar, Shift+Enter para nova linha
        </p>
      </div>
    </div>
  );
}
