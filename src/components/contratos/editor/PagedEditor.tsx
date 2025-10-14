import { useState, useEffect } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useAutoPagination } from './hooks/useAutoPagination';
import { A4PageWrapper } from './A4PageWrapper';

interface PagedEditorProps {
  editor: Editor;
  headerEditor?: Editor;
  footerEditor?: Editor;
  showPageNumbers?: boolean;
  pageNumberPosition?: 'left' | 'center' | 'right';
  pageNumberFormat?: string;
  startNumber?: number;
  fontFamily?: string;
  fontSize?: number;
}

export function PagedEditor({
  editor,
  headerEditor,
  footerEditor,
  showPageNumbers = true,
  pageNumberPosition = 'center',
  pageNumberFormat = 'Página {n} de {total}',
  startNumber = 1,
  fontFamily = 'Arial',
  fontSize = 10
}: PagedEditorProps) {
  const [zoom, setZoom] = useState(1);
  const { totalPages, contentRef, usableHeightPx } = useAutoPagination(zoom);

  const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5];
  const currentZoomIndex = zoomLevels.indexOf(zoom);

  const handleZoomIn = () => {
    if (currentZoomIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentZoomIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    if (currentZoomIndex > 0) {
      setZoom(zoomLevels[currentZoomIndex - 1]);
    }
  };

  const handleFitWidth = () => {
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
  }, [currentZoomIndex]);

  return (
    <div className="paged-editor-container">
      {/* Controles de Zoom */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b p-2 flex items-center justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={currentZoomIndex === 0}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-mono min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          disabled={currentZoomIndex === zoomLevels.length - 1}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleFitWidth}
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Container de medição invisível */}
      <div 
        ref={contentRef} 
        className="absolute opacity-0 pointer-events-none" 
        style={{ width: '15cm' }}
      >
        {headerEditor && <EditorContent editor={headerEditor} />}
        <EditorContent editor={editor} />
        {footerEditor && <EditorContent editor={footerEditor} />}
      </div>

      {/* Páginas A4 visíveis */}
      <div className="py-8">
        {Array.from({ length: totalPages }).map((_, index) => (
          <A4PageWrapper
            key={index}
            pageNumber={index + 1}
            totalPages={totalPages}
            zoom={zoom}
            isLastPage={index === totalPages - 1}
            showPageNumber={showPageNumbers}
            pageNumberPosition={pageNumberPosition}
            pageNumberFormat={pageNumberFormat}
            startNumber={startNumber}
            fontFamily={fontFamily}
            fontSize={fontSize}
          >
            {/* Conteúdo com altura controlada */}
            <div 
              className="page-content-wrapper"
              style={{
                height: `${usableHeightPx}px`,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Cabeçalho (apenas primeira página) */}
              {index === 0 && headerEditor && (
                <div className="page-header mb-4">
                  <EditorContent editor={headerEditor} />
                </div>
              )}

              {/* Conteúdo principal com offset por página */}
              <div 
                className="relative"
                style={{
                  transform: `translateY(-${index * usableHeightPx}px)`,
                  pointerEvents: 'all',
                }}
              >
                <EditorContent editor={editor} />
              </div>

              {/* Rodapé (apenas última página) */}
              {index === totalPages - 1 && footerEditor && (
                <div className="page-footer absolute bottom-0 left-0 right-0 mt-4">
                  <EditorContent editor={footerEditor} />
                </div>
              )}
            </div>
          </A4PageWrapper>
        ))}
      </div>
    </div>
  );
}
