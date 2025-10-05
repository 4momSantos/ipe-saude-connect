import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Trash2 } from "lucide-react";

interface RascunhoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lastSaved: Date;
  onContinue: () => void;
  onStartNew: () => void;
}

export function RascunhoDialog({
  open,
  onOpenChange,
  lastSaved,
  onContinue,
  onStartNew
}: RascunhoDialogProps) {
  const timeAgo = formatDistanceToNow(lastSaved, {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rascunho Encontrado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você possui uma inscrição em andamento neste edital.
            </p>
            <p className="text-sm text-muted-foreground">
              Última atualização: <span className="font-medium">{timeAgo}</span>
            </p>
            <p className="text-sm">
              Deseja continuar de onde parou ou começar uma nova inscrição?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={onStartNew}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Começar Novo
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className="bg-primary hover:bg-primary/90"
          >
            Continuar Rascunho
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
