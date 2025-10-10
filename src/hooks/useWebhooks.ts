import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useWebhooks() {
  const queryClient = useQueryClient();

  const { data: webhooks, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (webhook: {
      nome: string;
      url: string;
      eventos: string[];
      ativo?: boolean;
      secret?: string;
    }) => {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .insert({
          nome: webhook.nome,
          url: webhook.url,
          eventos: webhook.eventos,
          ativo: webhook.ativo ?? true,
          secret: webhook.secret || '',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Webhook criado',
        description: 'Webhook registrado com sucesso.',
      });
    },
  });

  const updateWebhookMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Webhook atualizado',
        description: 'Alterações salvas com sucesso.',
      });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast({
        title: 'Webhook removido',
        description: 'Webhook deletado com sucesso.',
      });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('disparar-webhook', {
        body: { webhook_id: id, test: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Webhook testado',
        description: 'Requisição enviada com sucesso.',
      });
    },
  });

  return {
    webhooks,
    isLoading,
    createWebhook: createWebhookMutation.mutate,
    updateWebhook: updateWebhookMutation.mutate,
    deleteWebhook: deleteWebhookMutation.mutate,
    testWebhook: testWebhookMutation.mutate,
  };
}

export function useWebhookDeliveries(webhookId?: string) {
  return useQuery({
    queryKey: ['webhook-deliveries', webhookId],
    queryFn: async () => {
      if (!webhookId) return [];
      
      const { data, error } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('subscription_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!webhookId,
  });
}
