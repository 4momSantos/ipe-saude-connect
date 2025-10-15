import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, AlertCircle, Eye, Upload, Loader2, Copy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Inscricao {
  id: string;
  status: string;
  created_at: string;
  retry_count: number;
  protocolo: string | null;
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
  const navigate = useNavigate();

  // Debug logging
  console.log('[INSCRICAO_CARD] Dados da inscrição:', {
    id: inscricao.id,
    status: inscricao.status,
    retry_count: inscricao.retry_count,
    workflow_status: inscricao.workflow_executions?.status,
    has_error: !!inscricao.workflow_executions?.error_message
  });

  // Buscar documentos rejeitados e OCRs pendentes
  const { data: documentos } = useQuery({
    queryKey: ['inscricao-documentos-status', inscricao.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('inscricao_documentos')
        .select('id, status, is_current, ocr_processado')
        .eq('inscricao_id', inscricao.id)
        .eq('is_current', true);
      return data || [];
    }
  });

  const documentosRejeitados = documentos?.filter(d => d.status === 'rejeitado').length || 0;
  const ocrsPendentes = documentos?.filter(d => !d.ocr_processado).length || 0;

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
          <div className="space-y-1.5">
            <CardTitle className="text-lg">
              {inscricao.editais?.titulo || 'Edital não encontrado'}
            </CardTitle>
            
            {/* Protocolo */}
            {inscricao.protocolo && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="font-mono">
                  {inscricao.protocolo}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={() => {
                    navigator.clipboard.writeText(inscricao.protocolo!);
                    toast.success('Protocolo copiado!');
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            )}
            
            {ocrsPendentes > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {ocrsPendentes} OCR(s) processando
              </Badge>
            )}
          </div>
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

        {/* Alerta de documentos rejeitados */}
        {documentosRejeitados > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                ⚠️ {documentosRejeitados} documento(s) rejeitado(s) precisa(m) ser reenviado(s)
              </span>
            </AlertDescription>
          </Alert>
        )}

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

        <div className="flex flex-wrap gap-2">
          {documentosRejeitados > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => navigate(`/minhas-inscricoes/${inscricao.id}/documentos-rejeitados`)}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Reenviar Documentos ({documentosRejeitados})
            </Button>
          )}
          {canRetry && (
            <Button onClick={onRetry} variant="default" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reenviar Inscrição
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => navigate(`/minhas-inscricoes/${inscricao.id}`)} 
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
