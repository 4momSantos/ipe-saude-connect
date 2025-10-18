import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  FileText, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from "lucide-react";
import { useSendSingleContractToSign } from "@/hooks/useSendSingleContractToSign";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

interface ContratoAprovadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contrato: {
    id: string;
    numero_contrato: string;
    candidato_nome: string;
    candidato_email: string;
    documento_url?: string;
  } | null;
  onContratoEnviado?: () => void;
}

export function ContratoAprovadoModal({
  open,
  onOpenChange,
  contrato,
  onContratoEnviado
}: ContratoAprovadoModalProps) {
  const [showPDF, setShowPDF] = useState(false);
  const [contratoEnviado, setContratoEnviado] = useState(false);
  const { mutate: sendContract, isPending } = useSendSingleContractToSign();

  if (!contrato) return null;

  const handleEnviarAgora = () => {
    sendContract(contrato.id, {
      onSuccess: () => {
        setContratoEnviado(true);
        onContratoEnviado?.();
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      }
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !contratoEnviado && !isPending) {
      const confirmar = window.confirm(
        '⚠️ ATENÇÃO!\n\n' +
        'O contrato foi gerado mas ainda não foi enviado para assinatura.\n\n' +
        'Se fechar agora, você precisará enviar manualmente pela página de Contratos.\n\n' +
        'Deseja realmente fechar sem enviar?'
      );
      
      if (!confirmar) {
        return;
      }
      
      toast.info(
        '📋 Contrato não enviado',
        {
          description: 'Você pode enviar depois em /contratos',
          duration: 8000
        }
      );
    }
    
    onOpenChange(open);
  };

  const handleRevisarContrato = () => {
    if (contrato.documento_url) {
      window.open(contrato.documento_url, '_blank');
    }
    setShowPDF(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-xl">Candidato Aprovado!</DialogTitle>
              <DialogDescription>
                Contrato gerado com sucesso
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Informações do Contrato */}
        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Contrato</span>
              <Badge variant="outline" className="font-mono">
                {contrato.numero_contrato}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-muted-foreground min-w-[80px]">Candidato:</span>
                <span className="text-sm font-medium">{contrato.candidato_nome}</span>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="text-sm text-muted-foreground">{contrato.candidato_email}</span>
              </div>
            </div>
          </div>

          {/* Pergunta Principal */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm font-medium">
              Enviar contrato para assinatura digital agora?
            </AlertDescription>
          </Alert>

          {/* Feedback de envio */}
          {showPDF && (
            <Alert variant="default" className="bg-blue-50 border-blue-200">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800">
                PDF aberto em nova aba. Você pode revisar e enviar quando estiver pronto.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Aviso: Envio obrigatório */}
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-sm text-red-800 font-medium">
            ⚠️ IMPORTANTE: Não feche este modal sem enviar o contrato! Se fechar, precisará enviar manualmente depois.
          </AlertDescription>
        </Alert>

        {/* Botões de Ação */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="secondary"
            onClick={handleRevisarContrato}
            disabled={isPending || !contrato.documento_url}
            className="w-full sm:w-auto"
          >
            <FileText className="h-4 w-4 mr-2" />
            Revisar Contrato
          </Button>

          <Button
            onClick={handleEnviarAgora}
            disabled={isPending}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                📤 Enviar Agora
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
