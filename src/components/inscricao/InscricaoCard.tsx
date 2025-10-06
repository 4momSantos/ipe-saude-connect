import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, AlertCircle, Eye } from 'lucide-react';

interface Inscricao {
  id: string;
  status: string;
  created_at: string;
  retry_count: number;
  editais: {
    titulo: string;
    numero_edital: string | null;
  } | null;
  workflow_executions?: {
    status: string;
    error_message: string | null;
  } | null;
}

interface InscricaoCardProps {
  inscricao: Inscricao;
  onRetry: () => void;
  onView: () => void;
}

export function InscricaoCard({ inscricao, onRetry, onView }: InscricaoCardProps) {
  // Debug logging
  console.log('[INSCRICAO_CARD] Dados da inscrição:', {
    id: inscricao.id,
    status: inscricao.status,
    retry_count: inscricao.retry_count,
    workflow_status: inscricao.workflow_executions?.status,
    has_error: !!inscricao.workflow_executions?.error_message
  });

  const canRetry = 
    (inscricao.status === 'inabilitado' || 
     inscricao.status === 'rejeitado' || 
     inscricao.workflow_executions?.status === 'failed') &&
    inscricao.retry_count < 3;

  const isFailed = 
    inscricao.status === 'inabilitado' || 
    inscricao.status === 'rejeitado' ||
    inscricao.workflow_executions?.status === 'failed';

  return (
    <Card className={isFailed ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">
            {inscricao.editais?.titulo || 'Edital não encontrado'}
          </CardTitle>
          <StatusBadge status={inscricao.status as any} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Enviado: {formatDistanceToNow(new Date(inscricao.created_at), {
            addSuffix: true,
            locale: ptBR
          })}
        </p>

        {isFailed && inscricao.workflow_executions?.error_message && (
          <div className="flex items-start gap-2 p-3 bg-amber-100 dark:bg-amber-950/40 rounded-md border border-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                Falha no processamento
              </p>
              <p className="text-amber-700 dark:text-amber-300">
                {inscricao.workflow_executions.error_message}
              </p>
              {canRetry && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Tentativas restantes: {3 - inscricao.retry_count}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {canRetry && (
            <Button onClick={onRetry} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reenviar Inscrição
            </Button>
          )}
          <Button variant="outline" onClick={onView} className="gap-2">
            <Eye className="h-4 w-4" />
            Acompanhar Processo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
