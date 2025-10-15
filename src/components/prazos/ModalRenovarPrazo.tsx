import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Prazo } from '@/hooks/usePrazos';

interface ModalRenovarPrazoProps {
  prazo: Prazo | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (novaData: string, observacao: string) => void;
}

export function ModalRenovarPrazo({ prazo, open, onClose, onConfirm }: ModalRenovarPrazoProps) {
  const [novaData, setNovaData] = useState<Date>();
  const [observacao, setObservacao] = useState('');

  const handleConfirm = () => {
    if (!novaData) return;
    
    const dataFormatada = format(novaData, 'yyyy-MM-dd');
    onConfirm(dataFormatada, observacao);
    
    // Reset
    setNovaData(undefined);
    setObservacao('');
    onClose();
  };

  if (!prazo) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Renovar Prazo</DialogTitle>
          <DialogDescription>
            Atualize a data de vencimento para: <strong>{prazo.entidade_nome}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Data Atual de Vencimento</Label>
            <div className="text-sm text-muted-foreground">
              {format(new Date(prazo.data_vencimento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nova Data de Vencimento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !novaData && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {novaData ? (
                    format(novaData, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                  ) : (
                    'Selecione uma data'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={novaData}
                  onSelect={setNovaData}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              placeholder="Motivo da renovação..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!novaData}>
            Confirmar Renovação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
