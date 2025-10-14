import { useEffect, useState, useRef, RefObject } from 'react';

// Constantes A4 (1cm = 37.795px em 96 DPI)
const A4_HEIGHT_CM = 29.7;
const MARGIN_TOP_CM = 2.5;
const MARGIN_BOTTOM_CM = 2.5;
const CM_TO_PX = 37.795;

export interface PageBreakInfo {
  pageNumber: number;
  startHeight: number;
  endHeight: number;
}

export interface UseAutoPaginationReturn {
  totalPages: number;
  contentRef: RefObject<HTMLDivElement>;
  pageBreaks: PageBreakInfo[];
  usableHeightPx: number;
}

export function useAutoPagination(zoom: number = 1): UseAutoPaginationReturn {
  const [totalPages, setTotalPages] = useState(1);
  const [pageBreaks, setPageBreaks] = useState<PageBreakInfo[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  // Calcular altura útil da página com zoom
  const usableHeightPx = (A4_HEIGHT_CM - MARGIN_TOP_CM - MARGIN_BOTTOM_CM) * CM_TO_PX * zoom;

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const calculatePages = () => {
      if (!content) return;

      const contentHeight = content.scrollHeight;
      const calculatedPages = Math.max(1, Math.ceil(contentHeight / usableHeightPx));

      setTotalPages(calculatedPages);

      // Calcular pontos de quebra de página
      const breaks: PageBreakInfo[] = [];
      for (let i = 0; i < calculatedPages; i++) {
        breaks.push({
          pageNumber: i + 1,
          startHeight: i * usableHeightPx,
          endHeight: (i + 1) * usableHeightPx,
        });
      }
      setPageBreaks(breaks);
    };

    // Executar cálculo inicial
    calculatePages();

    // Usar ResizeObserver para detectar mudanças no conteúdo
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(calculatePages, 100);
    });

    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
    };
  }, [usableHeightPx]);

  return {
    totalPages,
    contentRef,
    pageBreaks,
    usableHeightPx,
  };
}
