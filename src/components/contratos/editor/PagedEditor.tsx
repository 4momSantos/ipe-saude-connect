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
  const [totalPages, setTotalPages] = useState(1);

  // Constantes A4
  const pageHeightCm = 29.7;
  const usableHeightCm = pageHeightCm - topMargin - bottomMargin;
  const CM_TO_PX = 37.795;

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

  // Calcular número de páginas baseado na altura do conteúdo
  useEffect(() => {
    if (!editor) return;
    
    const updatePageCount = () => {
      const editorElement = document.querySelector('.ProseMirror');
      if (editorElement) {
        const contentHeightPx = editorElement.scrollHeight;
        const usableHeightPx = usableHeightCm * CM_TO_PX * zoom;
        const pages = Math.ceil(contentHeightPx / usableHeightPx) || 1;
        setTotalPages(pages);
      }
    };

    editor.on('update', updatePageCount);
    const timeoutId = setTimeout(updatePageCount, 100);

    return () => {
      editor.off('update', updatePageCount);
      clearTimeout(timeoutId);
    };
  }, [editor, usableHeightCm, zoom]);

  // Scroll listener para régua vertical
  useEffect(() => {
    const handleScroll = () => {
      setScrollOffset(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="paged-editor-container py-8 px-8" style={{ minHeight: '100vh' }}>
      {/* Régua Horizontal - STICKY */}
      {showRulers && (
        <HorizontalRuler
          zoom={zoom}
          leftMargin={leftMargin}
          rightMargin={21 - rightMargin}
          tabs={tabs}
          onLeftMarginChange={setLeftMargin}
          onRightMarginChange={(cm) => setRightMargin(21 - cm)}
          onTabsChange={setTabs}
          visible={showRulers}
        />
      )}

      {/* Container principal do editor */}
      <div 
        className="relative"
        style={{
          width: `${21 * zoom}cm`,
          marginLeft: showRulers ? '40px' : '20px',
        }}
      >
        {/* Indicador de múltiplas páginas no topo */}
        <div className="sticky top-0 left-0 right-0 bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 z-30 shadow-sm mb-4 rounded-t-lg">
          📄 Documento com {totalPages} {totalPages === 1 ? 'página' : 'páginas'} • Edição contínua ativa
        </div>

        {/* Container da página A4 */}
        <div
          className="a4-page-wrapper bg-white shadow-lg relative"
          style={{
            width: `${21 * zoom}cm`,
            minHeight: `${29.7 * zoom}cm`,
            paddingTop: `${topMargin * zoom}cm`,
            paddingBottom: `${bottomMargin * zoom}cm`,
            paddingLeft: `${leftMargin * zoom}cm`,
            paddingRight: `${rightMargin * zoom}cm`,
            position: 'relative',
          }}
        >
          {/* Régua vertical - ABSOLUTE */}
          {showRulers && (
            <VerticalRuler
              zoom={zoom}
              topMargin={topMargin}
              bottomMargin={29.7 - bottomMargin}
              onTopMarginChange={setTopMargin}
              onBottomMarginChange={(cm) => setBottomMargin(29.7 - cm)}
              visible={showRulers}
            />
          )}

          {/* Indicadores de margens */}
          <div 
            className="page-margins-indicator"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              border: '1px dashed rgba(0, 0, 0, 0.08)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* CABEÇALHO (se existir) */}
          {headerEditor && (
            <div className="mb-4 pb-2 border-b border-gray-200 relative z-10">
              <EditorContent editor={headerEditor} />
            </div>
          )}

          {/* EDITOR PRINCIPAL - CONTÍNUO */}
          <div className="relative z-10">
            <EditorContent editor={editor} />
          </div>

          {/* RODAPÉ (se existir) */}
          {footerEditor && (
            <div className="mt-4 pt-2 border-t border-gray-200 relative z-10">
              <EditorContent editor={footerEditor} />
            </div>
          )}
        </div>

        {/* Quebras de página visuais - FORA do wrapper para cobrir toda a largura */}
        {Array.from({ length: totalPages - 1 }).map((_, i) => {
          const pageHeight = usableHeightCm;
          return (
            <div
              key={i}
              className="relative pointer-events-none"
              style={{
                width: `${21 * zoom}cm`,
                height: '40px',
                marginTop: `${(topMargin + (i + 1) * pageHeight) * zoom}cm`,
                marginBottom: '-40px',
              }}
            >
              <div 
                className="absolute left-0 right-0 top-1/2 -translate-y-1/2"
                style={{
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent 0%, #3b82f6 10%, #3b82f6 90%, transparent 100%)',
                }}
              />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-1 text-xs font-bold text-blue-600 border border-blue-300 rounded-full shadow-sm">
                PÁGINA {i + 2}
              </div>
            </div>
          );
        })}

        {/* Numeração de páginas */}
        {showPageNumbers && Array.from({ length: totalPages }).map((_, i) => {
          const pageHeight = usableHeightCm;
          return (
            <div
              key={i}
              className={`absolute ${
                pageNumberPosition === 'left' ? 'left-0' :
                pageNumberPosition === 'right' ? 'right-0' : 
                'left-1/2 -translate-x-1/2'
              }`}
              style={{
                top: `${(topMargin + (i + 1) * pageHeight + 0.5) * zoom}cm`,
                paddingLeft: pageNumberPosition === 'left' ? `${leftMargin * zoom}cm` : 0,
                paddingRight: pageNumberPosition === 'right' ? `${rightMargin * zoom}cm` : 0,
                fontFamily: fontFamily,
                fontSize: `${fontSize * zoom}pt`,
                color: '#666',
                zIndex: 20,
              }}
            >
              {pageNumberFormat
                .replace('{n}', String(i + startNumber))
                .replace('{total}', String(totalPages))}
            </div>
          );
        })}
      </div>

      {/* Controles de Zoom */}
      <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white shadow-lg rounded-lg p-2 border z-50">
        <Button variant="ghost" size="sm" onClick={handleZoomOut}>
          -
        </Button>
        <span className="text-sm font-medium min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={handleZoomIn}>
          +
        </Button>
        <Button variant="ghost" size="sm" onClick={handleFitWidth}>
          Ajustar
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowRulers(!showRulers)}
        >
          {showRulers ? 'Ocultar réguas' : 'Mostrar réguas'}
        </Button>
      </div>
    </div>
  );
}
