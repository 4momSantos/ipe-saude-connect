import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock } from "lucide-react";

interface IdleWarningModalProps {
  open: boolean;
  remainingSeconds: number;
  onContinue: () => void;
}

export function IdleWarningModal({ open, remainingSeconds, onContinue }: IdleWarningModalProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Sessão Expirando
          </AlertDialogTitle>
          <AlertDialogDescription>
            Sua sessão expirará em <strong>{minutes}:{seconds.toString().padStart(2, '0')}</strong> devido à inatividade.
            <br />
            Clique em "Continuar Conectado" para permanecer logado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onContinue}>
            Continuar Conectado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
