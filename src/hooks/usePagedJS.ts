import { useState, useRef, useCallback, useEffect } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const isRenderingRef = useRef(false);
  const renderIdRef = useRef(0);
  
  // Usar refs para callbacks para evitar recriar generatePreview
  const onReadyRef = useRef(options.onReady);
  const onErrorRef = useRef(options.onError);
  
  useEffect(() => {
    onReadyRef.current = options.onReady;
    onErrorRef.current = options.onError;
  }, [options.onReady, options.onError]);

  const generatePreview = useCallback(async (htmlContent: string) => {
    // Prevenir renderizações simultâneas
    if (isRenderingRef.current) {
      console.log('⏸️ Renderização já em andamento, aguardando...');
      return;
    }

    if (!containerRef.current) {
      const err = new Error('Container não encontrado');
      setError(err);
      onErrorRef.current?.(err);
      return;
    }

    // Cancelar renderização anterior
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log('🛑 Renderização anterior cancelada');
    }

    // Criar novo AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Marcar como renderizando
    isRenderingRef.current = true;
    const renderId = ++renderIdRef.current;
    
    setIsRendering(true);
    setIsReady(false);
    setError(null);

    try {
      console.log(`🔄 [Render #${renderId}] Iniciando renderização Paged.js...`);
      console.log(`📄 [Render #${renderId}] HTML length:`, htmlContent.length);
      console.log(`🎨 [Render #${renderId}] CSS URL:`, pagedStylesUrl);

      // Verificar se foi abortado antes de limpar
      if (abortController.signal.aborted) {
        console.log(`⏭️ [Render #${renderId}] Abortado antes de limpar container`);
        return;
      }

      // Limpar container anterior
      containerRef.current.innerHTML = '';

      // Verificar novamente após operação
      if (abortController.signal.aborted) {
        console.log(`⏭️ [Render #${renderId}] Abortado antes de criar Previewer`);
        return;
      }

      // Criar novo previewer
      const previewer = new Previewer();
      previewerRef.current = previewer;

      // Log detalhado do HTML
      console.log(`📋 [Render #${renderId}] HTML Preview:`, {
        length: htmlContent.length,
        firstParagraph: htmlContent.match(/<p[^>]*>.*?<\/p>/)?.[0],
        hasInlineStyles: htmlContent.includes('style='),
        styleCount: (htmlContent.match(/style=/g) || []).length
      });

      // Renderizar com Paged.js
      const flow = await previewer.preview(
        htmlContent,
        [pagedStylesUrl],
        containerRef.current
      );

      // CRÍTICO: Verificar se foi abortado APÓS preview
      if (abortController.signal.aborted) {
        console.log(`⏭️ [Render #${renderId}] Renderização abortada, ignorando resultado`);
        return;
      }

      if (!flow) {
        throw new Error('Paged.js retornou flow null/undefined');
      }

      const pages = flow.total || 0;
      
      console.log(`✅ [Render #${renderId}] Paged.js renderizou ${pages} páginas com sucesso`);
      
      // Verificar se container ainda existe antes de acessar DOM
      if (!containerRef.current) {
        console.log(`⏭️ [Render #${renderId}] Container foi destruído após preview`);
        return;
      }
      
      // Verificar se DOM foi atualizado
      const domPages = containerRef.current.querySelectorAll('.pagedjs_page');
      console.log(`📑 [Render #${renderId}] Páginas no DOM: ${domPages.length}`);
      
      if (domPages.length === 0 && pages > 0) {
        console.error(`❌ [Render #${renderId}] ERRO: flow.total > 0 mas DOM não tem .pagedjs_page`);
        console.error('Container innerHTML:', containerRef.current.innerHTML.substring(0, 200));
      }

      setTotalPages(pages);
      setIsReady(true);
      onReadyRef.current?.(pages);
      
    } catch (err) {
      // Ignorar erros de abort
      if (err instanceof Error && err.name === 'AbortError') {
        console.log(`⏭️ [Render #${renderId}] Renderização cancelada`);
        return;
      }
      
      const error = err instanceof Error ? err : new Error('Erro ao gerar preview');
      
      console.error(`❌ [Render #${renderId}] ERRO PAGED.JS:`, {
        message: error.message,
        stack: error.stack,
        containerExists: !!containerRef.current,
        containerHTML: containerRef.current?.innerHTML.substring(0, 100),
        cssUrl: pagedStylesUrl
      });
      
      setError(error);
      onErrorRef.current?.(error);
    } finally {
      // Só atualizar estado se não foi abortado
      if (!abortController.signal.aborted) {
        setIsRendering(false);
      }
      isRenderingRef.current = false;
    }
  }, []); // Sem dependências - estável para sempre

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
    setIsRendering(false);
    setIsReady(false);
    setTotalPages(0);
    setError(null);
    previewerRef.current = null;
    isRenderingRef.current = false;
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
