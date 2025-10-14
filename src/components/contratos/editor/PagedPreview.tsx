import { useEffect, useMemo } from 'react';
import { usePagedJS } from '@/hooks/usePagedJS';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PagedPreviewProps {
  content: string;
  headerContent?: string;
  footerContent?: string;
  onReady?: (totalPages: number) => void;
}

// Função para processar HTML e garantir URLs absolutas
function processHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Processar imagens para garantir URLs absolutas
  doc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('http') && !src.startsWith('blob:') && !src.startsWith('data:')) {
      img.setAttribute('src', new URL(src, window.location.origin).href);
    }
  });
  
  return doc.body.innerHTML;
}

// Pré-carregar fontes do sistema
async function preloadFonts(): Promise<void> {
  const fonts = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Helvetica'
  ];
  
  try {
    await Promise.all(
      fonts.map(font => document.fonts.load(`12px "${font}"`))
    );
  } catch (err) {
    console.warn('Algumas fontes não puderam ser carregadas:', err);
  }
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

  // Processar e combinar HTML com useMemo para evitar recálculos
  const processedHTML = useMemo(() => {
    let fullHtml = '';
    
    // Adicionar cabeçalho se existir
    if (headerContent && headerContent !== '<p></p>' && headerContent.trim() !== '') {
      fullHtml += `<div class="running-header">${processHTML(headerContent)}</div>`;
    }
    
    // Adicionar conteúdo principal
    fullHtml += processHTML(content);
    
    // Adicionar rodapé se existir
    if (footerContent && footerContent !== '<p></p>' && footerContent.trim() !== '') {
      fullHtml += `<div class="document-footer">${processHTML(footerContent)}</div>`;
    }

    return fullHtml;
  }, [content, headerContent, footerContent]);

  useEffect(() => {
    let isMounted = true;

    async function renderPreview() {
      try {
        // Pré-carregar fontes antes de renderizar
        await preloadFonts();
        
        // Gerar preview apenas se o componente ainda estiver montado
        if (isMounted) {
          await generatePreview(processedHTML);
        }
      } catch (err) {
        console.error('Erro ao renderizar preview:', err);
      }
    }

    renderPreview();

    return () => {
      isMounted = false;
    };
  }, [processedHTML, generatePreview]);

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
