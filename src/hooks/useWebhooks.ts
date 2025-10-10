// FASE 6.4: Hook - Webhooks
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
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  subscription_id: string;
  evento: string;
  payload: any;
  response_status: number | null;
  response_body: string | null;
  tentativas: number;
  sucesso: boolean;
  created_at: string;
}

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
      return data as WebhookSubscription[];
    }
  });

  const createWebhookMutation = useMutation({
    mutationFn: async (webhook: Partial<WebhookSubscription>) => {
      const { data: user } = await supabase.auth.getUser();

      // Gerar secret aleatório se não fornecido
      const secret = webhook.secret || crypto.randomUUID();

      const { error } = await supabase
        .from('webhook_subscriptions')
        .insert({
          ...webhook,
          secret,
          created_by: user.user?.id
        });

      if (error) throw error;
      return { secret };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success("Webhook criado com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar webhook: ${error.message}`);
    }
  });

  const updateWebhookMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WebhookSubscription> }) => {
      const { error } = await supabase
        .from('webhook_subscriptions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success("Webhook atualizado com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar webhook: ${error.message}`);
    }
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
      toast.success("Webhook removido com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover webhook: ${error.message}`);
    }
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const { data: webhook } = await supabase
        .from('webhook_subscriptions')
        .select('url, secret')
        .eq('id', webhookId)
        .single();

      if (!webhook) throw new Error('Webhook não encontrado');

      // Criar assinatura HMAC
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: { message: 'Test webhook from IPE Saúde' }
      };

      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhook.secret);
      const messageData = encoder.encode(JSON.stringify(testPayload));

      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign('HMAC', key, messageData);
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Enviar teste
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IPE-Signature': signatureHex,
          'X-IPE-Event': 'test'
        },
        body: JSON.stringify(testPayload)
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      return { status: response.status };
    },
    onSuccess: (data) => {
      toast.success(`Webhook testado com sucesso (${data.status})`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao testar webhook: ${error.message}`);
    }
  });

  return {
    webhooks: webhooks || [],
    isLoading,
    createWebhook: createWebhookMutation.mutateAsync,
    updateWebhook: updateWebhookMutation.mutate,
    deleteWebhook: deleteWebhookMutation.mutate,
    testWebhook: testWebhookMutation.mutate,
    isTestando: testWebhookMutation.isPending
  };
}

export function useWebhookDeliveries(subscriptionId?: string) {
  return useQuery({
    queryKey: ['webhook-deliveries', subscriptionId],
    queryFn: async () => {
      let query = supabase
        .from('webhook_deliveries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (subscriptionId) {
        query = query.eq('subscription_id', subscriptionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WebhookDelivery[];
    },
    enabled: !!subscriptionId || subscriptionId === undefined
  });
}
