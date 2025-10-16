import { Eye, Download, FileText, Clock, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ResultadoBusca } from '@/hooks/useBuscarDocumentos';
import { StatusBadge } from '@/components/prazos/StatusBadge';

interface DocumentoItemProps {
  documento: ResultadoBusca;
  onVisualizar: (url: string, nome: string) => void;
  onBaixar: (url: string, nome: string) => void;
  showCredenciado?: boolean;
  showPrazo?: boolean;
  onVerOCR?: (doc: ResultadoBusca) => void;
}

export function DocumentoItem({ 
  documento, 
  onVisualizar, 
  onBaixar, 
  showCredenciado = true,
  showPrazo = false,
  onVerOCR
}: DocumentoItemProps) {
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'validado':
      case 'aprovado':
        return 'default';
      case 'pendente':
        return 'secondary';
      case 'rejeitado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className="p-3 hover:bg-accent/30 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h5 className="text-sm font-medium truncate">{documento.arquivo_nome}</h5>
              <Badge variant={getStatusBadgeVariant(documento.status)} className="text-xs">
                {documento.status}
              </Badge>
              {showPrazo && documento.dias_para_vencer !== undefined && documento.status_prazo && (
                <StatusBadge 
                  diasRestantes={documento.dias_para_vencer} 
                  status={documento.status_prazo as any}
                  compact
                />
              )}
              {documento.ocr_processado && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Database className="h-3 w-3" />
                  OCR
                </Badge>
              )}
            </div>
            {showCredenciado && (
              <p className="text-xs text-muted-foreground">
                {documento.credenciado_nome} {documento.credenciado_cpf && `• ${documento.credenciado_cpf}`}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(documento.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            {documento.snippet && (
              <p className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-1.5 rounded mt-1 line-clamp-1">
                ...{documento.snippet}...
              </p>
            )}
            {showPrazo && documento.data_vencimento && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Vence em: {new Date(documento.data_vencimento).toLocaleDateString('pt-BR')}
                  {documento.dias_para_vencer !== undefined && (
                    <span className="ml-1">
                      ({documento.dias_para_vencer > 0 
                        ? `${documento.dias_para_vencer} dias` 
                        : `vencido há ${Math.abs(documento.dias_para_vencer)} dias`
                      })
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => onVisualizar(documento.arquivo_url, documento.arquivo_nome)}
            title="Visualizar documento"
            className="h-8 w-8 p-0"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => onBaixar(documento.arquivo_url, documento.arquivo_nome)}
            title="Baixar documento"
            className="h-8 w-8 p-0"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          {onVerOCR && documento.ocr_processado && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => onVerOCR(documento)}
              title="Ver dados extraídos (OCR)"
              className="h-8 w-8 p-0"
            >
              <Database className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
