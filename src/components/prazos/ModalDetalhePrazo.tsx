// FASE 2 e 3: Modal de Detalhes e Prorrogação de Prazo
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { PrazoVencimento } from "@/hooks/usePrazosVencimentos";
import { useProrrogarPrazo } from "@/hooks/useProrrogarPrazo";
import { AlertCircle, Calendar, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ModalDetalhePrazoProps {
  prazo: PrazoVencimento;
  open: boolean;
  onClose: () => void;
  onProrrogar: () => void;
}

export const ModalDetalhePrazo = ({ prazo, open, onClose, onProrrogar }: ModalDetalhePrazoProps) => {
  const [novaData, setNovaData] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const prorrogarPrazo = useProrrogarPrazo();

  const handleProrrogar = async () => {
    if (!novaData || !justificativa || justificativa.length < 30) {
      return;
    }

    await prorrogarPrazo.mutateAsync({
      prazo_id: prazo.id,
      nova_data: novaData,
      justificativa
    });

    onProrrogar();
  };

  const dataMinima = new Date();
  dataMinima.setDate(dataMinima.getDate() + 1);
  const dataMin = dataMinima.toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes do Prazo</DialogTitle>
          <DialogDescription>
            Informações completas e ações disponíveis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Prazo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Credenciado</Label>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{prazo.credenciado_nome}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Tipo de Prazo</Label>
              <span className="font-medium capitalize">{prazo.tipo_prazo.replace(/_/g, " ")}</span>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Data de Vencimento</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {new Date(prazo.data_vencimento).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Dias Restantes</Label>
              <span className={`font-bold ${prazo.dias_restantes < 0 ? "text-red-600" : "text-foreground"}`}>
                {prazo.dias_restantes < 0 ? `${Math.abs(prazo.dias_restantes)} dias vencido` : `${prazo.dias_restantes} dias`}
              </span>
            </div>
          </div>

          {prazo.dias_restantes < 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este prazo está vencido há {Math.abs(prazo.dias_restantes)} dias. É necessário tomar ação imediata.
              </AlertDescription>
            </Alert>
          )}

          {/* Formulário de Prorrogação */}
          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Prorrogar Prazo</h3>
            
            <div className="space-y-2">
              <Label htmlFor="nova-data">Nova Data de Vencimento *</Label>
              <Input
                id="nova-data"
                type="date"
                min={dataMin}
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificativa">
                Justificativa * <span className="text-xs text-muted-foreground">(mínimo 30 caracteres)</span>
              </Label>
              <Textarea
                id="justificativa"
                rows={4}
                placeholder="Digite a justificativa para prorrogação deste prazo..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {justificativa.length}/30 caracteres
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleProrrogar}
            disabled={!novaData || justificativa.length < 30 || prorrogarPrazo.isPending}
          >
            {prorrogarPrazo.isPending ? "Prorrogando..." : "Confirmar Prorrogação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};