import { Eye, Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ResultadoBusca } from '@/hooks/useBuscarDocumentos';

interface DocumentoItemProps {
  documento: ResultadoBusca;
  onVisualizar: (url: string, nome: string) => void;
  onBaixar: (url: string, nome: string) => void;
  showCredenciado?: boolean;
}

export function DocumentoItem({ documento, onVisualizar, onBaixar, showCredenciado = true }: DocumentoItemProps) {
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
        </div>
      </div>
    </Card>
  );
}
