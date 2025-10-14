import { useState, ReactNode, useEffect } from 'react';
import { A4Page } from './A4Page';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { useAutoPagination } from './hooks/useAutoPagination';

interface PagedDocumentProps {
  headerContent?: string;
  footerContent?: string;
  children: ReactNode;
  showPageNumbers?: boolean;
  pageNumberPosition?: 'left' | 'center' | 'right';
  pageNumberFormat?: string;
  startNumber?: number;
  fontFamily?: string;
  fontSize?: number;
}

export function PagedDocument({
  headerContent,
  footerContent,
  children,
  showPageNumbers = true,
  pageNumberPosition = 'center',
  pageNumberFormat = 'Página {n} de {total}',
  startNumber = 1,
  fontFamily = 'Arial',
  fontSize = 10
}: PagedDocumentProps) {
  const [zoom, setZoom] = useState(1);
  const { totalPages, contentRef, pageBreaks, usableHeightPx } = useAutoPagination(zoom);

  const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];

  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  const handleFitToWidth = () => {
    setZoom(1);
  };

  // Atalhos de teclado para zoom
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '0') {
          e.preventDefault();
          setZoom(1);
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [zoom]);

  return (
    <div className="paged-document-container bg-gray-100 min-h-screen">
      {/* Controles de Zoom */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm p-2 flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoom === ZOOM_LEVELS[0]}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-medium min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleFitToWidth}
        >
          <Maximize className="h-4 w-4 mr-1" />
          Ajustar
        </Button>
      </div>

      {/* Container de medição invisível */}
      <div className="absolute opacity-0 pointer-events-none" style={{ width: '15cm' }}>
        <div ref={contentRef}>
          {headerContent && (
            <div 
              className="page-header mb-6 pb-4 border-b"
              dangerouslySetInnerHTML={{ __html: headerContent }}
            />
          )}
          <div className="page-content" style={{ textAlign: 'justify' }}>
            {children}
          </div>
          {footerContent && (
            <div 
              className="page-footer mt-6 pt-4 border-t"
              dangerouslySetInnerHTML={{ __html: footerContent }}
            />
          )}
        </div>
      </div>

      {/* Área de Páginas */}
      <div className="py-8">
        {Array.from({ length: totalPages }).map((_, index) => (
          <A4Page
            key={index}
            pageNumber={index + 1}
            totalPages={totalPages}
            showPageNumber={showPageNumbers}
            pageNumberPosition={pageNumberPosition}
            pageNumberFormat={pageNumberFormat}
            zoom={zoom}
            isLastPage={index === totalPages - 1}
            startNumber={startNumber}
            fontFamily={fontFamily}
            fontSize={fontSize}
          >
            {/* Cabeçalho */}
            {headerContent && (
              <div 
                className="page-header mb-6 pb-4 border-b"
                dangerouslySetInnerHTML={{ __html: headerContent }}
              />
            )}

            {/* Conteúdo */}
            <div 
              className="page-content"
              style={{ 
                textAlign: 'justify',
                overflow: 'hidden',
                height: `${usableHeightPx}px`,
              }}
            >
              <div 
                style={{ 
                  transform: `translateY(-${index * usableHeightPx}px)`,
                }}
              >
                {children}
              </div>
            </div>

            {/* Rodapé */}
            {footerContent && (
              <div 
                className="page-footer mt-6 pt-4 border-t"
                dangerouslySetInnerHTML={{ __html: footerContent }}
              />
            )}
          </A4Page>
        ))}
      </div>
    </div>
  );
}
