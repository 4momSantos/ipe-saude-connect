import { useState, useRef, useCallback } from 'react';
import { Previewer } from 'pagedjs';

export interface UsePagedJSOptions {
  onReady?: (totalPages: number) => void;
  onError?: (error: Error) => void;
}

export function usePagedJS(options: UsePagedJSOptions = {}) {
  const [isRendering, setIsRendering] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const previewerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const generatePreview = useCallback(async (htmlContent: string) => {
    if (!containerRef.current) {
      const err = new Error('Container não encontrado');
      setError(err);
      options.onError?.(err);
      return;
    }

    setIsRendering(true);
    setIsReady(false);
    setError(null);

    try {
      // Limpar container anterior
      containerRef.current.innerHTML = '';

      // Criar novo previewer
      const previewer = new Previewer();
      previewerRef.current = previewer;

      // Renderizar com Paged.js
      const flow = await previewer.preview(
        htmlContent,
        ['/src/components/contratos/editor/paged-styles.css'],
        containerRef.current
      );

      const pages = flow.total || 0;
      setTotalPages(pages);
      setIsReady(true);
      options.onReady?.(pages);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao gerar preview');
      setError(error);
      options.onError?.(error);
      console.error('Erro no Paged.js:', err);
    } finally {
      setIsRendering(false);
    }
  }, [options]);

  const exportPDF = useCallback(async () => {
    if (!isReady || !containerRef.current) {
      throw new Error('Preview não está pronto para exportação');
    }

    try {
      // Usar window.print() para gerar PDF
      // O navegador usará os estilos @page do paged-styles.css
      window.print();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao exportar PDF');
      setError(error);
      throw error;
    }
  }, [isReady]);

  const reset = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    setIsRendering(false);
    setIsReady(false);
    setTotalPages(0);
    setError(null);
    previewerRef.current = null;
  }, []);

  return {
    containerRef,
    isRendering,
    isReady,
    totalPages,
    error,
    generatePreview,
    exportPDF,
    reset,
  };
}
