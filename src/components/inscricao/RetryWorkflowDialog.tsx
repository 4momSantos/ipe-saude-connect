import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface RetryWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inscricaoId: string;
  errorMessage?: string;
  retryCount: number;
}

export function RetryWorkflowDialog({ 
  open, 
  onOpenChange, 
  inscricaoId, 
  errorMessage,
  retryCount 
}: RetryWorkflowDialogProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const navigate = useNavigate();

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      
      const { data, error } = await supabase.functions.invoke('retry-workflow', {
        body: { inscricaoId }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Reenvio iniciado! Seu processo está sendo processado novamente.');
      onOpenChange(false);
      
      // Redirecionar para página de acompanhamento
      setTimeout(() => {
        navigate('/analises');
      }, 1500);
      
    } catch (error: any) {
      console.error('[RETRY_WORKFLOW] Erro:', error);
      toast.error('Erro ao reenviar inscrição. Tente novamente.');
    } finally {
      setIsRetrying(false);
    }
  };

  const maxRetries = 3;
  const remainingRetries = maxRetries - retryCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>Reenviar Inscrição</DialogTitle>
          </div>
          <DialogDescription className="space-y-3 pt-4">
            <p>
              Sua inscrição teve uma falha técnica durante o processamento. 
              Você pode tentar novamente clicando no botão abaixo.
            </p>
            
            {errorMessage && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium mb-1">Motivo da falha:</p>
                <p className="text-muted-foreground">{errorMessage}</p>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              <span>
                Tentativas restantes: <strong>{remainingRetries}</strong> de {maxRetries}
              </span>
            </div>

            {remainingRetries === 1 && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                ⚠️ Esta é sua última tentativa automática. 
                Após isso, será necessário contato com o suporte.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRetrying}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRetry}
            disabled={isRetrying || remainingRetries <= 0}
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Reenviando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Confirmar Reenvio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
