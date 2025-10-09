import { useState } from "react";
import { useSancoes } from "@/hooks/useSancoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Shield } from "lucide-react";

export function GerenciarSancoes({ credenciadoId }: { credenciadoId: string }) {
  const { sancoes, isLoading, createSancao } = useSancoes(credenciadoId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{
    tipo_sancao: 'advertencia' | 'suspensao' | 'multa' | 'descredenciamento';
    motivo: string;
    data_inicio: string;
    data_fim: string;
    duracao_dias: number;
    valor_multa: string;
    observacoes: string;
  }>({
    tipo_sancao: 'advertencia',
    motivo: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    duracao_dias: 30,
    valor_multa: '',
    observacoes: ''
  });

  const handleSubmit = () => {
    createSancao({
      ...form,
      valor_multa: form.valor_multa ? parseFloat(form.valor_multa) : null,
      data_fim: form.data_fim || null
    });
    setForm({
      tipo_sancao: 'advertencia',
      motivo: '',
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: '',
      duracao_dias: 30,
      valor_multa: '',
      observacoes: ''
    });
    setDialogOpen(false);
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando sanções...</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativa': return 'destructive';
      case 'cumprida': return 'secondary';
      case 'cancelada': return 'outline';
      default: return 'default';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sanções
            </CardTitle>
            <Button onClick={() => setDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Sanção
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sancoes.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              Nenhuma sanção aplicada
            </div>
          ) : (
            <div className="space-y-4">
              {sancoes.map((s) => (
                <div key={s.id} className="border-l-4 border-red-500 pl-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      <Badge variant="destructive">{s.tipo_sancao}</Badge>
                      <Badge variant={getStatusColor(s.status || 'ativa')}>{s.status}</Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(s.data_inicio).toLocaleDateString('pt-BR')}
                      {s.data_fim && ` - ${new Date(s.data_fim).toLocaleDateString('pt-BR')}`}
                    </span>
                  </div>
                  <p className="text-sm">{s.motivo}</p>
                  {s.valor_multa && (
                    <p className="text-sm font-semibold text-destructive">
                      Multa: R$ {s.valor_multa.toFixed(2)}
                    </p>
                  )}
                  {s.observacoes && (
                    <p className="text-xs text-muted-foreground">{s.observacoes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aplicar Sanção</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Sanção</Label>
              <Select value={form.tipo_sancao} onValueChange={(v: typeof form.tipo_sancao) => setForm({ ...form, tipo_sancao: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advertencia">Advertência</SelectItem>
                  <SelectItem value="suspensao">Suspensão</SelectItem>
                  <SelectItem value="multa">Multa</SelectItem>
                  <SelectItem value="descredenciamento">Descredenciamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea 
                value={form.motivo}
                onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input 
                  type="date" 
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim (opcional)</Label>
                <Input 
                  type="date" 
                  value={form.data_fim}
                  onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                />
              </div>
            </div>

            {form.tipo_sancao === 'multa' && (
              <div className="space-y-2">
                <Label>Valor da Multa (R$)</Label>
                <Input 
                  type="number" 
                  step="0.01"
                  value={form.valor_multa}
                  onChange={(e) => setForm({ ...form, valor_multa: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea 
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                rows={2}
              />
            </div>

            <Button onClick={handleSubmit} className="w-full">
              Aplicar Sanção
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
