import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAfastamentos } from '@/hooks/useAfastamentos';
import { useState } from 'react';

interface RegistrarAfastamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credenciadoId: string;
}

export function RegistrarAfastamentoDialog({
  open,
  onOpenChange,
  credenciadoId
}: RegistrarAfastamentoDialogProps) {
  const { registrarAfastamento } = useAfastamentos(credenciadoId);
  const [tipo, setTipo] = useState<'licenca' | 'ferias' | 'afastamento'>('licenca');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [justificativa, setJustificativa] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await registrarAfastamento.mutateAsync({
      tipo,
      data_inicio: dataInicio,
      data_fim: dataFim || undefined,
      motivo: motivo || undefined,
      justificativa
    });

    // Reset form
    setTipo('licenca');
    setDataInicio('');
    setDataFim('');
    setMotivo('');
    setJustificativa('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Licença/Afastamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(value: any) => setTipo(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="licenca">Licença</SelectItem>
                <SelectItem value="ferias">Férias</SelectItem>
                <SelectItem value="afastamento">Afastamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data de Início *</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataFim">Data de Término</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo (opcional)</Label>
            <Input
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Licença médica, Férias anuais..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="justificativa">Justificativa *</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva detalhadamente o motivo do afastamento..."
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={registrarAfastamento.isPending}>
              {registrarAfastamento.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
