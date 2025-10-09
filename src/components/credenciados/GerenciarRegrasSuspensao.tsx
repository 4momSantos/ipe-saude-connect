import { useState } from "react";
import { useRegrasSuspensao } from "@/hooks/useRegrasSuspensao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Shield, Trash2 } from "lucide-react";

export function GerenciarRegrasSuspensao() {
  const { regras, isLoading, createRegra, toggleRegraAtivo, deleteRegra } = useRegrasSuspensao();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{
    nome: string;
    descricao: string;
    tipo_gatilho: 'ocorrencias' | 'avaliacoes' | 'vencimento_docs' | 'sancoes_acumuladas';
    acao: 'suspensao' | 'alerta' | 'descredenciamento' | 'notificacao';
    duracao_dias: number;
    prioridade: number;
    condicao: {
      quantidade: number;
      gravidade: string;
      periodo_dias: number;
    };
  }>({
    nome: '',
    descricao: '',
    tipo_gatilho: 'ocorrencias',
    acao: 'suspensao',
    duracao_dias: 30,
    prioridade: 1,
    condicao: {
      quantidade: 3,
      gravidade: 'alta',
      periodo_dias: 30
    }
  });

  const handleSubmit = () => {
    createRegra({
      ...form,
      condicao: form.condicao
    });
    setDialogOpen(false);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando regras...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Regras de Suspensão Automática
            </CardTitle>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {regras.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhuma regra configurada
            </div>
          ) : (
            <div className="space-y-4">
              {regras.map((regra) => (
                <div key={regra.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{regra.nome}</h4>
                        <Badge variant={regra.ativo ? 'default' : 'secondary'}>
                          {regra.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Badge variant="outline">
                          Prioridade {regra.prioridade}
                        </Badge>
                      </div>
                      {regra.descricao && (
                        <p className="text-sm text-muted-foreground">{regra.descricao}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={regra.ativo}
                        onCheckedChange={(checked) => toggleRegraAtivo({ id: regra.id, ativo: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRegra(regra.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Gatilho:</span>
                      <Badge variant="outline" className="ml-2">{regra.tipo_gatilho}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Ação:</span>
                      <Badge variant="outline" className="ml-2">{regra.acao}</Badge>
                    </div>
                    {regra.duracao_dias && (
                      <div>
                        <span className="text-muted-foreground">Duração:</span>
                        <span className="ml-2 font-medium">{regra.duracao_dias} dias</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Regra de Suspensão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Regra</Label>
              <Input 
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: 3 ocorrências graves em 30 dias"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Gatilho</Label>
                <Select value={form.tipo_gatilho} onValueChange={(v: typeof form.tipo_gatilho) => setForm({ ...form, tipo_gatilho: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ocorrencias">Ocorrências</SelectItem>
                    <SelectItem value="avaliacoes">Avaliações</SelectItem>
                    <SelectItem value="vencimento_docs">Vencimento de Documentos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ação</Label>
                <Select value={form.acao} onValueChange={(v: typeof form.acao) => setForm({ ...form, acao: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="suspensao">Suspensão</SelectItem>
                    <SelectItem value="alerta">Alerta</SelectItem>
                    <SelectItem value="descredenciamento">Descredenciamento</SelectItem>
                    <SelectItem value="notificacao">Notificação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.tipo_gatilho === 'ocorrencias' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input 
                    type="number"
                    value={form.condicao.quantidade}
                    onChange={(e) => setForm({ 
                      ...form, 
                      condicao: { ...form.condicao, quantidade: parseInt(e.target.value) }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gravidade</Label>
                  <Select 
                    value={form.condicao.gravidade} 
                    onValueChange={(v) => setForm({ 
                      ...form, 
                      condicao: { ...form.condicao, gravidade: v }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Período (dias)</Label>
                  <Input 
                    type="number"
                    value={form.condicao.periodo_dias}
                    onChange={(e) => setForm({ 
                      ...form, 
                      condicao: { ...form.condicao, periodo_dias: parseInt(e.target.value) }
                    })}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (dias)</Label>
                <Input 
                  type="number"
                  value={form.duracao_dias}
                  onChange={(e) => setForm({ ...form, duracao_dias: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input 
                  type="number"
                  value={form.prioridade}
                  onChange={(e) => setForm({ ...form, prioridade: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <Button onClick={handleSubmit} className="w-full">
              Criar Regra
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
