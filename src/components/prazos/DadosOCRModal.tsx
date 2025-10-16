import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, FileText } from 'lucide-react';

interface DadosOCRModalProps {
  open: boolean;
  onClose: () => void;
  documento: {
    tipo_documento: string;
    arquivo_nome: string;
    ocr_resultado?: Record<string, any>;
    ocr_processado?: boolean;
    ocr_confidence?: number;
  };
}

export function DadosOCRModal({ open, onClose, documento }: DadosOCRModalProps) {
  const { ocr_resultado, ocr_processado, ocr_confidence } = documento;

  const formatarChave = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase());
  };

  const getConfiancaColor = (confidence?: number) => {
    if (!confidence) return 'text-muted-foreground';
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Dados Extraídos - {documento.tipo_documento}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{documento.arquivo_nome}</p>
        </DialogHeader>

        {!ocr_processado && (
          <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Este documento ainda não foi processado via OCR.
            </p>
          </div>
        )}

        {ocr_processado && !ocr_resultado && (
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">
              OCR processado, mas nenhum dado foi extraído.
            </p>
          </div>
        )}

        {ocr_processado && ocr_resultado && (
          <div className="space-y-4">
            {/* Confiança */}
            {ocr_confidence && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Confiança do OCR:</span>
                <Badge variant="outline" className={getConfiancaColor(ocr_confidence)}>
                  {(ocr_confidence * 100).toFixed(1)}%
                </Badge>
              </div>
            )}

            {/* Campos Extraídos */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Campos Mapeados
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(ocr_resultado).map(([key, value]) => (
                  <div 
                    key={key} 
                    className="p-3 border rounded-lg bg-background hover:bg-accent/50 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground mb-1">
                      {formatarChave(key)}
                    </p>
                    <p className="text-sm font-medium break-words">
                      {String(value) || <span className="text-muted-foreground italic">Não encontrado</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* JSON Raw */}
            <details className="mt-4">
              <summary className="text-sm font-medium cursor-pointer hover:text-primary">
                Ver JSON completo
              </summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-64">
                {JSON.stringify(ocr_resultado, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
