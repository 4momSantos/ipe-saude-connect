import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WebhookSubscription {
  id: string;
  nome: string;
  url: string;
  eventos: string[];
  secret: string;
  ativo: boolean;
  criado_em: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  evento: string;
  payload: any;
  response_status: number;
  response_body: string | null;
  tentativas: number;
  sucesso: boolean;
  criado_em: string;
}

export function useWebhooks() {
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_subscriptions' as any)
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      return (data || []) as WebhookSubscription[];
    }
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (webhook: Omit<WebhookSubscription, 'id' | 'criado_em' | 'secret'>) => {
      // Gerar secret aleatório
      const secret = crypto.randomUUID();
      
      const { error } = await supabase
        .from('webhook_subscriptions' as any)
        .insert({
          ...webhook,
          secret
        });

      if (error) throw error;
      return secret;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success("Webhook criado");
    },
    onError: () => toast.error("Erro ao criar webhook")
  });

  const updateWebhookMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WebhookSubscription> & { id: string }) => {
      const { error } = await supabase
        .from('webhook_subscriptions' as any)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success("Webhook atualizado");
    },
    onError: () => toast.error("Erro ao atualizar webhook")
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_subscriptions' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success("Webhook removido");
    },
    onError: () => toast.error("Erro ao remover webhook")
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke('disparar-webhook', {
        body: {
          evento: 'test',
          payload: { message: 'Teste de webhook', timestamp: new Date().toISOString() }
        }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Teste enviado");
    },
    onError: () => toast.error("Erro ao testar webhook")
  });

  return {
    webhooks: webhooks || [],
    isLoading,
    createWebhook: createWebhookMutation.mutate,
    updateWebhook: updateWebhookMutation.mutate,
    deleteWebhook: deleteWebhookMutation.mutate,
    testWebhook: testWebhookMutation.mutate
  };
}

export function useWebhookDeliveries(subscriptionId?: string) {
  return useQuery({
    queryKey: ['webhook-deliveries', subscriptionId],
    queryFn: async () => {
      let query = supabase
        .from('webhook_deliveries' as any)
        .select('*')
        .order('criado_em', { ascending: false })
        .limit(50);

      if (subscriptionId) {
        query = query.eq('subscription_id', subscriptionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as WebhookDelivery[];
    }
  });
}
