import { useState, useRef, useCallback } from 'react';
import { Previewer } from 'pagedjs';
import pagedStylesUrl from '../components/contratos/editor/paged-styles.css?url';

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

      console.log('🔄 Iniciando renderização Paged.js...');
      console.log('📄 HTML length:', htmlContent.length);
      console.log('🎨 CSS URL:', pagedStylesUrl);

      // Renderizar com Paged.js
      const flow = await previewer.preview(
        htmlContent,
        [pagedStylesUrl],
        containerRef.current
      );

      if (!flow) {
        throw new Error('Paged.js retornou flow null/undefined');
      }

      const pages = flow.total || 0;
      
      console.log(`✅ Paged.js renderizou ${pages} páginas com sucesso`);
      
      // Verificar se DOM foi atualizado
      const domPages = containerRef.current.querySelectorAll('.pagedjs_page');
      console.log(`📑 Páginas no DOM: ${domPages.length}`);
      
      if (domPages.length === 0 && pages > 0) {
        console.error('❌ ERRO: flow.total > 0 mas DOM não tem .pagedjs_page');
        console.error('Container innerHTML:', containerRef.current.innerHTML.substring(0, 200));
      }

      setTotalPages(pages);
      setIsReady(true);
      options.onReady?.(pages);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erro ao gerar preview');
      
      console.error('❌ ERRO PAGED.JS:', {
        message: error.message,
        stack: error.stack,
        containerExists: !!containerRef.current,
        containerHTML: containerRef.current?.innerHTML.substring(0, 100),
        cssUrl: pagedStylesUrl
      });
      
      setError(error);
      options.onError?.(error);
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
