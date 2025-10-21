import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MESSAGE_PAGE_SIZE = 50;

// Mapeia papel do usuário para sender_type válido no banco
const mapearSenderType = (papel: string): 'analista' | 'candidato' | 'sistema' => {
  if (papel === 'analista' || papel === 'gestor' || papel === 'admin') {
    return 'analista';
  }
  return 'candidato';
};

interface Message {
  id: string;
  sender_id: string;
  sender_type: "analista" | "candidato" | "sistema";
  content: string;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
  sender_name?: string;
  sender_email?: string;
  lido_por?: string[];
  tipo?: string;
  mensagem_html?: string;
  manifestacao_metadata?: any;
  anexos?: any[];
  usuario_papel?: string;
  mencoes?: string[];
  resposta_para_id?: string;
  visivel_para?: string[];
  privada?: boolean;
}

interface UseWorkflowMessagesOptions {
  inscricaoId: string;
  executionId?: string;
  autoMarkAsRead?: boolean;
}

interface UseWorkflowMessagesReturn {
  messages: Message[];
  unreadCount: number;
  loading: boolean;
  sending: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWorkflowMessages({
  inscricaoId,
  executionId,
  autoMarkAsRead = true,
}: UseWorkflowMessagesOptions): UseWorkflowMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserType, setCurrentUserType] = useState<"analista" | "candidato">("candidato");
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef(false);

  // Carregar usuário atual
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Carregar mensagens e setup realtime com debounce
  useEffect(() => {
    if (!inscricaoId) return;

    loadMessages();

    let debounceTimer: NodeJS.Timeout;
    
    // Realtime subscription com incremental updates
    const channel = supabase
      .channel(`workflow-messages:${inscricaoId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workflow_messages",
          filter: `inscricao_id=eq.${inscricaoId}`,
        },
        (payload) => {
          console.log("[WORKFLOW_MESSAGES] Nova mensagem recebida");
          
          // Debounce: aguardar 300ms antes de processar
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const newMsg = payload.new as any;
            
            // Adicionar apenas se não é do usuário atual
            if (newMsg.sender_id !== currentUserId) {
              const lidoPorArray = newMsg.lido_por || [];
              const isReadForCurrentUser = currentUserId ? lidoPorArray.includes(currentUserId) : false;
              
              const formattedMsg: Message = {
                id: newMsg.id,
                sender_id: newMsg.sender_id,
                sender_type: newMsg.sender_type,
                content: newMsg.content || newMsg.mensagem,
                created_at: newMsg.created_at,
                is_read: isReadForCurrentUser,
                read_at: newMsg.read_at,
                sender_name: newMsg.usuario_nome || "Usuário",
                sender_email: newMsg.usuario_email,
                lido_por: lidoPorArray,
              };
              
              setMessages(prev => [...prev, formattedMsg]);
              setUnreadCount(prev => prev + 1);
            }
          }, 300);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workflow_messages",
          filter: `inscricao_id=eq.${inscricaoId}`,
        },
        (payload) => {
          console.log("[WORKFLOW_MESSAGES] Mensagem atualizada");
          
          // Para updates, debounce e refresh
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            loadMessages();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [inscricaoId, currentUserId]);

  // Auto-marcar como lidas quando mensagens mudam
  useEffect(() => {
    if (autoMarkAsRead && messages.length > 0 && currentUserId) {
      markUnreadMessagesAsRead();
    }
  }, [messages, currentUserId, autoMarkAsRead]);

  const loadCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Verificar roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAnalista = roles?.some(
        (r) => r.role === "analista" || r.role === "gestor" || r.role === "admin"
      );
      setCurrentUserType(isAnalista ? "analista" : "candidato");
    } catch (error) {
      console.error("[WORKFLOW_MESSAGES] Error loading user:", error);
    }
  };

  const loadMessages = async (append = false) => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);

      const currentOffset = append ? offset : 0;
      
      // Query otimizada: busca apenas os últimos N mensagens
      const { data, error, count } = await supabase
        .from("workflow_messages")
        .select(
          `
          id,
          sender_id,
          sender_type,
          content,
          mensagem,
          created_at,
          is_read,
          read_at,
          usuario_nome,
          usuario_email,
          lido_por
        `,
          { count: 'exact' }
        )
        .eq("inscricao_id", inscricaoId)
        .order("created_at", { ascending: false })
        .range(currentOffset, currentOffset + MESSAGE_PAGE_SIZE - 1);

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map((msg: any) => {
        // Calcular is_read baseado em lido_por para o usuário atual
        const lidoPorArray = msg.lido_por || [];
        const isReadForCurrentUser = currentUserId ? lidoPorArray.includes(currentUserId) : msg.is_read;
        
        return {
          id: msg.id,
          sender_id: msg.sender_id,
          sender_type: msg.sender_type,
          content: msg.content || msg.mensagem,
          created_at: msg.created_at,
          is_read: isReadForCurrentUser,
          read_at: msg.read_at,
          sender_name: msg.usuario_nome || "Usuário",
          sender_email: msg.usuario_email,
          lido_por: lidoPorArray,
          tipo: msg.tipo,
          mensagem_html: msg.mensagem_html,
          manifestacao_metadata: msg.manifestacao_metadata,
          anexos: msg.anexos,
          usuario_papel: msg.usuario_papel,
          mencoes: msg.mencoes,
          resposta_para_id: msg.resposta_para_id,
          visivel_para: msg.visivel_para,
          privada: msg.privada,
        };
      }).reverse(); // Reverter para ordem cronológica

      if (append) {
        setMessages(prev => [...formattedMessages, ...prev]);
      } else {
        setMessages(formattedMessages);
      }

      setHasMore((count || 0) > currentOffset + MESSAGE_PAGE_SIZE);
      if (append) {
        setOffset(currentOffset + MESSAGE_PAGE_SIZE);
      } else {
        setOffset(MESSAGE_PAGE_SIZE);
      }

      // Contar não lidas baseado em lido_por (usando filtro negativo)
      if (currentUserId) {
        const { data: allMessages } = await supabase
          .from("workflow_messages")
          .select('lido_por, sender_id')
          .eq("inscricao_id", inscricaoId)
          .neq("sender_id", currentUserId);

        const unreadTotal = (allMessages || []).filter(
          (msg: any) => !(msg.lido_por || []).includes(currentUserId)
        ).length;

        setUnreadCount(unreadTotal);
      }
    } catch (error) {
      console.error("[WORKFLOW_MESSAGES] Error loading messages:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  const loadMore = async () => {
    if (!hasMore || loadingRef.current) return;
    await loadMessages(true);
  };

  const markUnreadMessagesAsRead = async () => {
    if (!currentUserId) return;

    try {
      const unreadMessages = messages.filter(
        (m) => !m.is_read && m.sender_id !== currentUserId
      );

      if (unreadMessages.length === 0) return;

      // Usar SQL function para adicionar user_id ao array lido_por
      const { error } = await supabase.rpc('mark_messages_read', {
        message_ids: unreadMessages.map((m) => m.id),
        user_id: currentUserId
      });

      if (error) throw error;
    } catch (error) {
      console.error("[WORKFLOW_MESSAGES] Error marking as read:", error);
    }
  };

  const markAsRead = async (messageId: string) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase.rpc('mark_messages_read', {
        message_ids: [messageId],
        user_id: currentUserId
      });

      if (error) throw error;

      // Atualizar estado local
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_read: true } : m
        )
      );
    } catch (error) {
      console.error("[WORKFLOW_MESSAGES] Error marking message as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;

    try {
      const unreadIds = messages
        .filter((m) => !m.is_read && m.sender_id !== currentUserId)
        .map((m) => m.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase.rpc('mark_messages_read', {
        message_ids: unreadIds,
        user_id: currentUserId
      });

      if (error) throw error;

      setUnreadCount(0);
      loadMessages();
    } catch (error) {
      console.error("[WORKFLOW_MESSAGES] Error marking all as read:", error);
      toast.error("Erro ao marcar mensagens como lidas");
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !currentUserId || sending) return;

    try {
      setSending(true);

      const insertData: any = {
        execution_id: executionId || null,
        inscricao_id: inscricaoId,
        sender_id: currentUserId,
        sender_type: mapearSenderType(currentUserType),
        content: content.trim(),
        mensagem: content.trim(),
        tipo: 'comentario',
        visivel_para: ['todos'],
        usuario_papel: currentUserType,
        lido_por: [currentUserId],
      };

      const { error } = await supabase.from("workflow_messages").insert(insertData);

      if (error) throw error;

      toast.success("Mensagem enviada!");
    } catch (error) {
      console.error("[WORKFLOW_MESSAGES] Error sending message:", error);
      toast.error("Erro ao enviar mensagem");
      throw error;
    } finally {
      setSending(false);
    }
  };

  const refresh = useCallback(async () => {
    await loadMessages();
  }, [inscricaoId]);

  return {
    messages,
    unreadCount,
    loading,
    sending,
    hasMore,
    loadMore,
    sendMessage,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
