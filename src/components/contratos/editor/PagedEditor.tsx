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

      {/* Container principal do editor - ÚNICO E CONTÍNUO */}
      <div 
        className="relative mx-auto py-8"
        style={{
          width: `${21 * zoom}cm`,
          marginLeft: showRulers ? '32px' : 'auto',
          marginRight: 'auto',
          marginTop: showRulers ? '40px' : '0',
        }}
      >
        {/* Régua vertical */}
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

        {/* Container da página A4 - SEM overflow hidden */}
        <div
          className="a4-page-wrapper bg-white shadow-lg relative"
          style={{
            width: `${21 * zoom}cm`,
            minHeight: `${29.7 * zoom}cm`,
            paddingTop: `${topMargin * zoom}cm`,
            paddingBottom: `${bottomMargin * zoom}cm`,
            paddingLeft: `${leftMargin * zoom}cm`,
            paddingRight: `${rightMargin * zoom}cm`,
          }}
        >
          {/* Indicadores de margens */}
          <div 
            className="page-margins-indicator"
            style={{
              position: 'absolute',
              top: `${topMargin * zoom}cm`,
              bottom: `${bottomMargin * zoom}cm`,
              left: `${leftMargin * zoom}cm`,
              right: `${rightMargin * zoom}cm`,
              border: '1px dashed rgba(0, 0, 0, 0.08)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* CABEÇALHO (se existir) */}
          {headerEditor && (
            <div className="mb-4 pb-2 border-b border-gray-200">
              <EditorContent editor={headerEditor} />
            </div>
          )}

          {/* EDITOR PRINCIPAL - SEM OVERFLOW HIDDEN ✅ */}
          <div className="relative z-10">
            <EditorContent editor={editor} />
          </div>

          {/* RODAPÉ (se existir) */}
          {footerEditor && (
            <div className="mt-4 pt-2 border-t border-gray-200">
              <EditorContent editor={footerEditor} />
            </div>
          )}

          {/* Indicadores visuais de quebra de página (overlays) */}
          {Array.from({ length: totalPages - 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 pointer-events-none"
              style={{
                top: `${(i + 1) * pageHeightCm * zoom}cm`,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #3b82f6 20%, #3b82f6 80%, transparent)',
                zIndex: 5,
              }}
            >
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-2 text-xs font-semibold text-blue-600">
                QUEBRA DE PÁGINA
              </div>
            </div>
          ))}

          {/* Numeração de páginas (overlay) */}
          {showPageNumbers && Array.from({ length: totalPages }).map((_, i) => (
            <div
              key={i}
              className={`absolute ${
                pageNumberPosition === 'left' ? 'left-0' :
                pageNumberPosition === 'right' ? 'right-0' : 
                'left-1/2 -translate-x-1/2'
              }`}
              style={{
                top: `${(i + 1) * pageHeightCm * zoom - (bottomMargin * zoom / 2)}cm`,
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
          ))}
        </div>
      </div>
    </div>
  );
}
