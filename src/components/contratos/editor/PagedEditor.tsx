import { useState, useEffect } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ZoomIn, ZoomOut, Maximize2, Ruler } from 'lucide-react';
import { useAutoPagination } from './hooks/useAutoPagination';
import { A4PageWrapper } from './A4PageWrapper';
import { HorizontalRuler } from './rulers/HorizontalRuler';
import { VerticalRuler } from './rulers/VerticalRuler';

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
  const [currentZoomIndex, setCurrentZoomIndex] = useState(2);
  const [leftMargin, setLeftMargin] = useState(3);
  const [rightMargin, setRightMargin] = useState(18);
  const [topMargin, setTopMargin] = useState(2.5);
  const [bottomMargin, setBottomMargin] = useState(27.2);
  const [tabs, setTabs] = useState<number[]>([]);
  const [showRulers, setShowRulers] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const { totalPages, contentRef, usableHeightPx } = useAutoPagination(zoom);

  const zoomLevels = [0.5, 0.75, 1, 1.25, 1.5];

  const handleZoomIn = () => {
    if (currentZoomIndex < zoomLevels.length - 1) {
      const newIndex = currentZoomIndex + 1;
      setCurrentZoomIndex(newIndex);
      setZoom(zoomLevels[newIndex]);
    }
  };

  const handleZoomOut = () => {
    if (currentZoomIndex > 0) {
      const newIndex = currentZoomIndex - 1;
      setCurrentZoomIndex(newIndex);
      setZoom(zoomLevels[newIndex]);
    }
  };

  const handleFitWidth = () => {
    setZoom(1);
    setCurrentZoomIndex(2);
  };

  // Atalhos de teclado para zoom e réguas
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '0') {
          e.preventDefault();
          handleFitWidth();
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.shiftKey && e.key === 'R') {
          e.preventDefault();
          setShowRulers(!showRulers);
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [currentZoomIndex, showRulers]);

  // Scroll listener para régua vertical
  useEffect(() => {
    const handleScroll = () => {
      setScrollOffset(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="paged-editor-container">
      {/* Controles de Zoom - estilo Google Docs */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-2 flex items-center justify-center gap-3 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          disabled={currentZoomIndex === 0}
          title="Diminuir zoom (Ctrl + -)"
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Select 
          value={String(Math.round(zoom * 100))} 
          onValueChange={(value) => {
            const newZoom = Number(value) / 100;
            setZoom(newZoom);
            const index = zoomLevels.findIndex(z => z === newZoom);
            if (index !== -1) setCurrentZoomIndex(index);
          }}
        >
          <SelectTrigger className="w-24 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50%</SelectItem>
            <SelectItem value="75">75%</SelectItem>
            <SelectItem value="100">100%</SelectItem>
            <SelectItem value="125">125%</SelectItem>
            <SelectItem value="150">150%</SelectItem>
          </SelectContent>
        </Select>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          disabled={currentZoomIndex === zoomLevels.length - 1}
          title="Aumentar zoom (Ctrl + +)"
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFitWidth}
          title="Ajustar à largura (Ctrl + 0)"
          className="h-8 px-3"
        >
          <Maximize2 className="h-4 w-4 mr-1" />
          <span className="text-xs">Ajustar</span>
        </Button>

        <div className="w-px h-6 bg-gray-300" />

        <Button
          variant={showRulers ? "default" : "ghost"}
          size="sm"
          onClick={() => setShowRulers(!showRulers)}
          title="Mostrar/Ocultar réguas (Ctrl + Shift + R)"
          className="h-8 px-3"
        >
          <Ruler className="h-4 w-4 mr-1" />
          <span className="text-xs">Réguas</span>
        </Button>
      </div>

      {/* Régua Horizontal */}
      {showRulers && (
        <HorizontalRuler
          zoom={zoom}
          leftMargin={leftMargin}
          rightMargin={rightMargin}
          tabs={tabs}
          onLeftMarginChange={setLeftMargin}
          onRightMarginChange={setRightMargin}
          onTabsChange={setTabs}
        />
      )}

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
      <div className="py-8 relative" style={{ marginLeft: showRulers ? '30px' : 0 }}>
        {showRulers && (
          <VerticalRuler
            zoom={zoom}
            topMargin={topMargin}
            bottomMargin={bottomMargin}
            onTopMarginChange={setTopMargin}
            onBottomMarginChange={setBottomMargin}
            scrollOffset={scrollOffset}
          />
        )}
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
              leftMarginCm={leftMargin}
              rightMarginCm={rightMargin}
              topMarginCm={topMargin}
              bottomMarginCm={bottomMargin}
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
