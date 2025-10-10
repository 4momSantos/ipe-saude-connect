import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Copy, Key, Plus, Trash2, Power } from 'lucide-react';
import { useAPIKeys } from '@/hooks/useAPIKeys';
import { toast } from '@/hooks/use-toast';

export default function GerenciarAPIKeys() {
  const { apiKeys, isLoading, generateKey, toggleKey, deleteKey } = useAPIKeys();
  const [showDialog, setShowDialog] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: '', quota_diaria: 1000 });

  const handleGenerate = () => {
    generateKey(formData, {
      onSuccess: (key) => {
        setGeneratedKey(key);
        setFormData({ nome: '', quota_diaria: 1000 });
      },
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'API Key copiada para área de transferência.' });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar API Keys</h1>
          <p className="text-muted-foreground">Controle de acesso ao Web Service público</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Gerar Nova Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys Ativas</CardTitle>
          <CardDescription>Gerencie as chaves de acesso ao sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : apiKeys && apiKeys.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefix</TableHead>
                  <TableHead>Quota Diária</TableHead>
                  <TableHead>Utilizada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Utilização</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.nome}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{key.key_prefix}...</code>
                    </TableCell>
                    <TableCell>{key.quota_diaria?.toLocaleString()}</TableCell>
                    <TableCell>{key.quota_utilizada?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={key.ativo ? 'default' : 'secondary'}>
                        {key.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.ultima_utilizacao
                        ? new Date(key.ultima_utilizacao).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleKey({ id: key.id, ativo: !key.ativo })}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteId(key.id)}
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
            <p className="text-center text-muted-foreground py-8">Nenhuma API Key cadastrada</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Nova API Key</DialogTitle>
            <DialogDescription>
              Configure os parâmetros para a nova chave de acesso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da Aplicação</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Sistema Externo XYZ"
              />
            </div>
            <div>
              <Label>Quota Diária (requisições)</Label>
              <Input
                type="number"
                value={formData.quota_diaria}
                onChange={(e) => setFormData({ ...formData, quota_diaria: parseInt(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleGenerate}>
              <Key className="h-4 w-4 mr-2" />
              Gerar Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!generatedKey} onOpenChange={() => setGeneratedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Gerada com Sucesso!</DialogTitle>
            <DialogDescription>
              Copie esta chave agora. Ela não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg">
            <code className="text-sm break-all">{generatedKey}</code>
          </div>
          <DialogFooter>
            <Button onClick={() => generatedKey && copyToClipboard(generatedKey)}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Key
            </Button>
            <Button variant="outline" onClick={() => setGeneratedKey(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A API Key será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteKey(deleteId);
                setDeleteId(null);
              }}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
