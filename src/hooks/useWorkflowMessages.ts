import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  // Carregar usuário atual
  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Carregar mensagens e setup realtime
  useEffect(() => {
    if (!inscricaoId) return;

    loadMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`workflow-messages:${inscricaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_messages",
          filter: `inscricao_id=eq.${inscricaoId}`,
        },
        (payload) => {
          console.log("[WORKFLOW_MESSAGES] Realtime event:", payload.eventType);
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            loadMessages();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId]);

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

  const loadMessages = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("workflow_messages")
        .select(
          `
          *,
          profiles:sender_id (nome, email)
        `
        )
        .eq("inscricao_id", inscricaoId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        sender_type: msg.sender_type,
        content: msg.content || msg.mensagem,
        created_at: msg.created_at,
        is_read: msg.is_read,
        read_at: msg.read_at,
        sender_name: msg.usuario_nome || msg.profiles?.nome || "Usuário",
        sender_email: msg.usuario_email || msg.profiles?.email,
      }));

      setMessages(formattedMessages);

      // Contar não lidas (que não são do usuário atual)
      const unread = formattedMessages.filter(
        (m) => !m.is_read && m.sender_id !== currentUserId
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("[WORKFLOW_MESSAGES] Error loading messages:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  };

  const markUnreadMessagesAsRead = async () => {
    if (!currentUserId) return;

    try {
      const unreadMessages = messages.filter(
        (m) => !m.is_read && m.sender_id !== currentUserId
      );

      if (unreadMessages.length === 0) return;

      const { error } = await supabase
        .from("workflow_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in(
          "id",
          unreadMessages.map((m) => m.id)
        );

      if (error) throw error;
    } catch (error) {
      console.error("[WORKFLOW_MESSAGES] Error marking as read:", error);
    }
  };

  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("workflow_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) throw error;

      // Atualizar estado local
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
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

      const { error } = await supabase
        .from("workflow_messages")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in("id", unreadIds);

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
        sender_type: currentUserType,
        content: content.trim(),
        mensagem: content.trim(),
        tipo: 'comentario',
        visivel_para: ['todos'],
        usuario_papel: currentUserType,
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
    sendMessage,
    markAsRead,
    markAllAsRead,
    refresh,
  };
}
