import { useState, useEffect } from 'react';
import { Editor, EditorContent } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ZoomIn, ZoomOut, Maximize2, Ruler } from 'lucide-react';
import { useAutoPagination } from './hooks/useAutoPagination';
import { A4PageWrapper } from './A4PageWrapper';
import { HorizontalRuler } from './rulers/HorizontalRuler';
import { VerticalRuler } from './rulers/VerticalRuler';
import { MarginsControl } from './toolbar/MarginsControl';

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
  const [zoom, setZoom] = useState(1.25);
  const [currentZoomIndex, setCurrentZoomIndex] = useState(3);
  // Margens padrão Word: 2.5cm topo/fundo, 3cm esquerda/direita
  const [leftMargin, setLeftMargin] = useState(3);
  const [rightMargin, setRightMargin] = useState(3);
  const [topMargin, setTopMargin] = useState(2.5);
  const [bottomMargin, setBottomMargin] = useState(2.5);
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
    setZoom(1.25);
    setCurrentZoomIndex(3);
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
      {/* Régua Horizontal - fixa abaixo da toolbar */}
      {showRulers && (
        <div className="fixed left-0 right-0 z-35 bg-white border-b" style={{ top: '108px' }}>
          <HorizontalRuler
            zoom={zoom}
            leftMargin={leftMargin}
            rightMargin={21 - rightMargin}
            tabs={tabs}
            onLeftMarginChange={setLeftMargin}
            onRightMarginChange={(cm) => setRightMargin(21 - cm)}
            onTabsChange={setTabs}
          />
        </div>
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
      <div 
        className="py-8 px-4 relative" 
        style={{ 
          marginLeft: showRulers ? '32px' : 0,
          marginTop: showRulers ? '40px' : '0', // espaço para régua horizontal fixa
        }}
      >
        {showRulers && (
          <VerticalRuler
            zoom={zoom}
            topMargin={topMargin}
            bottomMargin={29.7 - bottomMargin}
            onTopMarginChange={setTopMargin}
            onBottomMarginChange={(cm) => setBottomMargin(29.7 - cm)}
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
                  marginTop: `-${index * usableHeightPx}px`,
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
