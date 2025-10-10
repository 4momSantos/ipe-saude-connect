import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, TestTube, Power, Activity } from 'lucide-react';
import { useWebhooks, useWebhookDeliveries } from '@/hooks/useWebhooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const EVENTOS_DISPONIVEIS = [
  'inscricao.criada',
  'inscricao.aprovada',
  'inscricao.rejeitada',
  'contrato.assinado',
  'credenciado.ativado',
  'credenciado.suspenso',
];

export default function GerenciarWebhooks() {
  const { webhooks, isLoading, createWebhook, updateWebhook, deleteWebhook, testWebhook } = useWebhooks();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const { data: deliveries } = useWebhookDeliveries(selectedWebhookId || undefined);
  const [formData, setFormData] = useState({
    nome: '',
    url: '',
    eventos: [] as string[],
    secret: '',
  });

  const handleCreate = () => {
    createWebhook(formData, {
      onSuccess: () => {
        setShowDialog(false);
        setFormData({ nome: '', url: '', eventos: [], secret: '' });
      },
    });
  };

  const toggleEvento = (evento: string) => {
    setFormData((prev) => ({
      ...prev,
      eventos: prev.eventos.includes(evento)
        ? prev.eventos.filter((e) => e !== evento)
        : [...prev.eventos, evento],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Webhooks</h1>
          <p className="text-muted-foreground">Configure webhooks para notificações externas</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Webhook
        </Button>
      </div>

      <Tabs defaultValue="webhooks">
        <TabsList>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="deliveries">Histórico de Entregas</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks Configurados</CardTitle>
              <CardDescription>Gerencie endpoints de notificação</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Carregando...</p>
              ) : webhooks && webhooks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Eventos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.nome}</TableCell>
                        <TableCell>
                          <code className="text-xs">{webhook.url}</code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(webhook.eventos as string[]).map((evento) => (
                              <Badge key={evento} variant="outline" className="text-xs">
                                {evento}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={webhook.ativo ? 'default' : 'secondary'}>
                            {webhook.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testWebhook(webhook.id)}
                            >
                              <TestTube className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedWebhookId(webhook.id)}
                            >
                              <Activity className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateWebhook({ id: webhook.id, ativo: !webhook.ativo })}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteWebhook(webhook.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhum webhook configurado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Entregas</CardTitle>
              <CardDescription>Últimas 50 tentativas de envio</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries && deliveries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Status HTTP</TableHead>
                      <TableHead>Tentativas</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((delivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell>{new Date(delivery.created_at).toLocaleString('pt-BR')}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{delivery.evento}</Badge>
                        </TableCell>
                        <TableCell>{delivery.resposta_status || '-'}</TableCell>
                        <TableCell>{delivery.tentativas}</TableCell>
                        <TableCell>
                          <Badge variant={delivery.status === 'sucesso' ? 'default' : 'destructive'}>
                            {delivery.status === 'sucesso' ? 'Sucesso' : 'Falha'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {selectedWebhookId ? 'Nenhuma entrega registrada' : 'Selecione um webhook para ver entregas'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Webhook</DialogTitle>
            <DialogDescription>Configure um endpoint para receber notificações</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Sistema Financeiro"
              />
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://api.exemplo.com/webhook"
              />
            </div>
            <div>
              <Label>Secret (opcional)</Label>
              <Input
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                placeholder="Chave secreta para validação"
                type="password"
              />
            </div>
            <div>
              <Label>Eventos</Label>
              <div className="space-y-2 mt-2">
                {EVENTOS_DISPONIVEIS.map((evento) => (
                  <div key={evento} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.eventos.includes(evento)}
                      onCheckedChange={() => toggleEvento(evento)}
                    />
                    <label className="text-sm">{evento}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate}>Criar Webhook</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
