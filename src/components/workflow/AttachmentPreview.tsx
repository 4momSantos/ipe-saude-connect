import { Button } from '@/components/ui/button';
import { 
  File, 
  FileImage, 
  FileText, 
  Download, 
  ZoomIn,
  FileSpreadsheet
} from 'lucide-react';

interface AttachmentPreviewProps {
  anexo: {
    nome: string;
    url: string;
    tipo: string;
    tamanho: number;
  };
  compact?: boolean;
}

export function AttachmentPreview({ anexo, compact = false }: AttachmentPreviewProps) {
  const isImage = anexo.tipo.startsWith('image/');
  const isPDF = anexo.tipo === 'application/pdf';

  // Ícone baseado no tipo
  const getFileIcon = () => {
    if (isImage) return <FileImage className="h-5 w-5" />;
    if (isPDF) return <FileText className="h-5 w-5" />;
    if (anexo.tipo.includes('word')) return <FileText className="h-5 w-5" />;
    if (anexo.tipo.includes('excel') || anexo.tipo.includes('spreadsheet')) 
      return <FileSpreadsheet className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  // Formatar tamanho
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (compact) {
    return (
      <a
        href={anexo.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent transition-colors"
      >
        {getFileIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{anexo.nome}</p>
          <p className="text-xs text-muted-foreground">{formatSize(anexo.tamanho)}</p>
        </div>
        <Download className="h-4 w-4 text-muted-foreground" />
      </a>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Preview de imagem */}
      {isImage && (
        <div className="relative aspect-video bg-muted">
          <img
            src={anexo.url}
            alt={anexo.nome}
            className="w-full h-full object-contain"
            loading="lazy"
          />
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-2 right-2"
            onClick={() => window.open(anexo.url, '_blank')}
          >
            <ZoomIn className="h-4 w-4 mr-1" />
            Ampliar
          </Button>
        </div>
      )}

      {/* Info do arquivo */}
      <div className="p-3 bg-card">
        <div className="flex items-center gap-3">
          {getFileIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{anexo.nome}</p>
            <p className="text-xs text-muted-foreground">{formatSize(anexo.tamanho)}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(anexo.url, '_blank')}
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
