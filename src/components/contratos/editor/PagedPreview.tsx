import { useEffect } from 'react';
import { usePagedJS } from '@/hooks/usePagedJS';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PagedPreviewProps {
  content: string;
  headerContent?: string;
  footerContent?: string;
  onReady?: (totalPages: number) => void;
}

export function PagedPreview({
  content,
  headerContent,
  footerContent,
  onReady
}: PagedPreviewProps) {
  const { 
    containerRef, 
    isRendering, 
    isReady,
    totalPages,
    error,
    generatePreview 
  } = usePagedJS({
    onReady,
    onError: (err) => console.error('Erro no Paged.js:', err)
  });

  useEffect(() => {
    // Combinar header, content e footer em um único HTML
    let fullHtml = '';
    
    if (headerContent && headerContent !== '<p></p>') {
      fullHtml += `<div class="running-header">${headerContent}</div>`;
    }
    
    fullHtml += content;
    
    if (footerContent && footerContent !== '<p></p>') {
      fullHtml += `<div class="document-footer">${footerContent}</div>`;
    }

    // Gerar preview
    generatePreview(fullHtml);
  }, [content, headerContent, footerContent, generatePreview]);

  return (
    <div className="paged-preview-wrapper h-full w-full flex flex-col items-center bg-gray-100 py-8 overflow-auto">
      {/* Loading State */}
      {isRendering && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Gerando preview com paginação profissional...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !isRendering && (
        <Alert variant="destructive" className="max-w-2xl mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Erro ao gerar preview: {error.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Success State - Info */}
      {isReady && !isRendering && (
        <div className="mb-4 text-sm text-muted-foreground">
          Preview gerado com sucesso • {totalPages} página{totalPages !== 1 ? 's' : ''}
        </div>
      )}

      {/* Container do Paged.js */}
      <div 
        ref={containerRef}
        className="paged-container bg-white shadow-lg"
        style={{
          maxWidth: '21cm',
          minHeight: '29.7cm',
        }}
      />

      {/* Instrução para impressão */}
      {isReady && !isRendering && (
        <div className="mt-4 text-xs text-muted-foreground text-center max-w-md">
          Para exportar como PDF, use o botão "Gerar PDF" ou pressione Ctrl+P
        </div>
      )}
    </div>
  );
}
