import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Calendar, Mail, Copy } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolo: string;
  dataEnvio: Date;
  emailCandidato: string;
  onAcompanhar: () => void;
  onNovaInscricao: () => void;
}

export function SuccessDialog({
  open,
  onOpenChange,
  protocolo,
  dataEnvio,
  emailCandidato,
  onAcompanhar,
  onNovaInscricao,
}: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="h-6 w-6" />
            <DialogTitle className="text-xl">Inscrição Enviada com Sucesso!</DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Protocolo com botão copiar */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Protocolo:</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-mono font-semibold">{protocolo}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(protocolo);
                  toast.success('Protocolo copiado para área de transferência!');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Data */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Data:</span>
            <span className="font-medium">{format(dataEnvio, "dd/MM/yyyy HH:mm")}</span>
          </div>

          {/* Aviso */}
          <p className="text-sm text-muted-foreground">
            Guarde este número para acompanhar seu processo.
          </p>

          {/* Email */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Um email foi enviado para:</p>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <span className="font-medium">{emailCandidato}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={onAcompanhar} className="w-full sm:w-auto">
            Acompanhar Inscrição
          </Button>
          <Button onClick={onNovaInscricao} variant="outline" className="w-full sm:w-auto">
            Fazer Nova Inscrição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
