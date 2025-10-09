import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useOcorrencias } from "@/hooks/useOcorrencias";

export function RegistrarOcorrencia({ 
  credenciadoId, 
  open, 
  onClose 
}: { 
  credenciadoId: string; 
  open: boolean; 
  onClose: () => void;
}) {
  const { createOcorrencia } = useOcorrencias(credenciadoId);
  const [form, setForm] = useState<{
    tipo: 'reclamacao' | 'advertencia' | 'elogio' | 'observacao';
    gravidade: 'baixa' | 'media' | 'alta' | 'critica';
    descricao: string;
    data_ocorrencia: string;
    providencias: string;
  }>({
    tipo: 'observacao',
    gravidade: 'baixa',
    descricao: '',
    data_ocorrencia: new Date().toISOString().split('T')[0],
    providencias: ''
  });

  const handleSubmit = () => {
    createOcorrencia(form);
    setForm({
      tipo: 'observacao',
      gravidade: 'baixa',
      descricao: '',
      data_ocorrencia: new Date().toISOString().split('T')[0],
      providencias: ''
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Ocorrência</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v: typeof form.tipo) => setForm({ ...form, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reclamacao">Reclamação</SelectItem>
                  <SelectItem value="advertencia">Advertência</SelectItem>
                  <SelectItem value="elogio">Elogio</SelectItem>
                  <SelectItem value="observacao">Observação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gravidade</Label>
              <Select value={form.gravidade} onValueChange={(v: typeof form.gravidade) => setForm({ ...form, gravidade: v })}>
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
          </div>

          <div className="space-y-2">
            <Label>Data da Ocorrência</Label>
            <Input 
              type="date" 
              value={form.data_ocorrencia}
              onChange={(e) => setForm({ ...form, data_ocorrencia: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea 
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              rows={5}
              placeholder="Descreva a ocorrência..."
            />
          </div>

          <div className="space-y-2">
            <Label>Providências Tomadas</Label>
            <Textarea 
              value={form.providencias}
              onChange={(e) => setForm({ ...form, providencias: e.target.value })}
              rows={3}
              placeholder="Descreva as providências tomadas..."
            />
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Registrar Ocorrência
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
