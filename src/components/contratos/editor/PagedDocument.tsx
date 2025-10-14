import { useState, ReactNode } from 'react';
import { A4Page } from './A4Page';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface PagedDocumentProps {
  headerContent?: string;
  footerContent?: string;
  children: ReactNode;
  showPageNumbers?: boolean;
  pageNumberPosition?: 'left' | 'center' | 'right';
  pageNumberFormat?: string;
}

export function PagedDocument({
  headerContent,
  footerContent,
  children,
  showPageNumbers = true,
  pageNumberPosition = 'center',
  pageNumberFormat = 'Página {n} de {total}'
}: PagedDocumentProps) {
  const [zoom, setZoom] = useState(1);

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

      {/* Área de Páginas */}
      <div className="py-8">
        <A4Page
          pageNumber={1}
          totalPages={1}
          showPageNumber={showPageNumbers}
          pageNumberPosition={pageNumberPosition}
          pageNumberFormat={pageNumberFormat}
          zoom={zoom}
        >
          {/* Cabeçalho */}
          {headerContent && (
            <div 
              className="page-header mb-6 pb-4 border-b"
              dangerouslySetInnerHTML={{ __html: headerContent }}
            />
          )}

          {/* Conteúdo */}
          <div className="page-content">
            {children}
          </div>

          {/* Rodapé */}
          {footerContent && (
            <div 
              className="page-footer mt-6 pt-4 border-t"
              dangerouslySetInnerHTML={{ __html: footerContent }}
            />
          )}
        </A4Page>
      </div>
    </div>
  );
}
