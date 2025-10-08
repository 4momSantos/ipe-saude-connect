import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Plus, Trash2, Key, Webhook, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface TriggerManagementProps {
  workflowId: string;
}

export function TriggerManagement({ workflowId }: TriggerManagementProps) {
  const queryClient = useQueryClient();
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [showNewSchedule, setShowNewSchedule] = useState(false);

  // Query webhooks
  const { data: webhooks } = useQuery({
    queryKey: ["workflow-webhooks", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_webhooks")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Query API keys
  const { data: apiKeys } = useQuery({
    queryKey: ["workflow-api-keys", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_api_keys")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Query schedules
  const { data: schedules } = useQuery({
    queryKey: ["workflow-schedules", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_schedules")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Gerar webhook
  const generateWebhookMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('generate_webhook_url', {
        p_workflow_id: workflowId
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (webhookUrl) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-webhooks", workflowId] });
      navigator.clipboard.writeText(webhookUrl);
      toast.success("Webhook URL gerado e copiado!");
      setShowNewWebhook(false);
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Gerar API Key
  const generateApiKeyMutation = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data, error } = await supabase.rpc('generate_api_key', {
        p_workflow_id: workflowId,
        p_name: input.name,
        p_description: input.description
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (apiKey) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-api-keys", workflowId] });
      navigator.clipboard.writeText(apiKey);
      toast.success("API Key gerado e copiado! Guarde em local seguro.");
      setShowNewApiKey(false);
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Criar schedule
  const createScheduleMutation = useMutation({
    mutationFn: async (input: { cron_expression: string; timezone: string; input_data: any }) => {
      const { data, error } = await supabase
        .from("workflow_schedules")
        .insert({
          workflow_id: workflowId,
          ...input
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-schedules", workflowId] });
      toast.success("Schedule criado com sucesso!");
      setShowNewSchedule(false);
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  return (
    <Tabs defaultValue="webhooks" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="webhooks">
          <Webhook className="h-4 w-4 mr-2" />
          Webhooks
        </TabsTrigger>
        <TabsTrigger value="api-keys">
          <Key className="h-4 w-4 mr-2" />
          API Keys
        </TabsTrigger>
        <TabsTrigger value="schedules">
          <Clock className="h-4 w-4 mr-2" />
          Schedules
        </TabsTrigger>
      </TabsList>

      {/* WEBHOOKS TAB */}
      <TabsContent value="webhooks" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Webhooks</h3>
            <p className="text-sm text-muted-foreground">
              Receba POSTs externos para disparar workflows
            </p>
          </div>
          <Dialog open={showNewWebhook} onOpenChange={setShowNewWebhook}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Webhook
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Webhook</DialogTitle>
                <DialogDescription>
                  Gerar URL única para receber requisições POST
                </DialogDescription>
              </DialogHeader>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  A URL será gerada automaticamente e copiada para área de transferência.
                  Configure autenticação após criar.
                </AlertDescription>
              </Alert>
              <Button onClick={() => generateWebhookMutation.mutate()}>
                Gerar Webhook URL
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {webhooks?.map((webhook) => (
            <Card key={webhook.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    <code className="text-xs">{webhook.webhook_id}</code>
                    <Badge variant={webhook.is_active ? "default" : "secondary"}>
                      {webhook.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const url = `${window.location.origin}/functions/v1/webhook-trigger/${workflowId}/${webhook.webhook_id}`;
                        navigator.clipboard.writeText(url);
                        toast.success("URL copiada!");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <div>Auth: <code>{webhook.auth_type}</code></div>
                <div>Rate Limit: {webhook.rate_limit_per_minute || 60}/min</div>
                <div>Criado: {new Date(webhook.created_at).toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
          {(!webhooks || webhooks.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum webhook configurado
            </div>
          )}
        </div>
      </TabsContent>

      {/* API KEYS TAB */}
      <TabsContent value="api-keys" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">API Keys</h3>
            <p className="text-sm text-muted-foreground">
              Autentique chamadas para trigger manual
            </p>
          </div>
          <Dialog open={showNewApiKey} onOpenChange={setShowNewApiKey}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova API Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar API Key</DialogTitle>
                <DialogDescription>
                  Gerar chave para autenticação de API
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  generateApiKeyMutation.mutate({
                    name: formData.get("name") as string,
                    description: formData.get("description") as string
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Nome</Label>
                  <Input name="name" placeholder="Production API Key" required />
                </div>
                <div>
                  <Label>Descrição (opcional)</Label>
                  <Textarea name="description" placeholder="Usado no sistema X..." />
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    A chave será mostrada apenas uma vez. Guarde em local seguro!
                  </AlertDescription>
                </Alert>
                <Button type="submit">Gerar API Key</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {apiKeys?.map((key) => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span className="font-semibold">{key.name}</span>
                    <Badge variant={key.is_active ? "default" : "secondary"}>
                      {key.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <div>Prefix: <code>{key.key_prefix}...</code></div>
                {key.description && <div>Descrição: {key.description}</div>}
                <div>Criado: {new Date(key.created_at).toLocaleString()}</div>
                {key.last_used_at && (
                  <div>Último uso: {new Date(key.last_used_at).toLocaleString()}</div>
                )}
              </CardContent>
            </Card>
          ))}
          {(!apiKeys || apiKeys.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma API key configurada
            </div>
          )}
        </div>
      </TabsContent>

      {/* SCHEDULES TAB */}
      <TabsContent value="schedules" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Schedules (Cron)</h3>
            <p className="text-sm text-muted-foreground">
              Execute workflows automaticamente em horários agendados
            </p>
          </div>
          <Dialog open={showNewSchedule} onOpenChange={setShowNewSchedule}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Schedule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Schedule</DialogTitle>
                <DialogDescription>
                  Agendar execução automática do workflow
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createScheduleMutation.mutate({
                    cron_expression: formData.get("cron") as string,
                    timezone: formData.get("timezone") as string,
                    input_data: {}
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Expressão Cron</Label>
                  <Input name="cron" placeholder="0 9 * * *" required />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ex: "0 9 * * *" = todo dia às 9h
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 ml-2"
                      onClick={() => window.open("https://crontab.guru", "_blank")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Crontab Guru
                    </Button>
                  </p>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select name="timezone" defaultValue="America/Sao_Paulo">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Sao_Paulo">America/Sao_Paulo (BRT)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit">Criar Schedule</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {schedules?.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <code className="text-xs">{schedule.cron_expression}</code>
                    <Badge variant={schedule.is_active ? "default" : "secondary"}>
                      {schedule.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <div>Timezone: {schedule.timezone}</div>
                {schedule.last_run_at && (
                  <div>Última execução: {new Date(schedule.last_run_at).toLocaleString()}</div>
                )}
                {schedule.next_run_at && (
                  <div>Próxima execução: {new Date(schedule.next_run_at).toLocaleString()}</div>
                )}
                <div>Criado: {new Date(schedule.created_at).toLocaleString()}</div>
              </CardContent>
            </Card>
          ))}
          {(!schedules || schedules.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum schedule configurado
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
