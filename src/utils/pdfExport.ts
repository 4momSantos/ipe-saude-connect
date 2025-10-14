import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Previewer } from 'pagedjs';

/**
 * Exporta conteúdo HTML para PDF usando Paged.js + html2canvas + jsPDF
 * 
 * @param content - Conteúdo HTML principal
 * @param header - HTML do cabeçalho (opcional)
 * @param footer - HTML do rodapé (opcional)
 * @param filename - Nome do arquivo PDF a ser gerado
 */
export async function exportToPDF(
  content: string,
  header?: string,
  footer?: string,
  filename: string = 'documento.pdf'
): Promise<void> {
  // Criar container temporário oculto
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '21cm'; // A4 width
  document.body.appendChild(container);

  try {
    // Combinar HTML
    let fullHtml = '';
    
    if (header && header !== '<p></p>' && header.trim() !== '') {
      fullHtml += `<div class="running-header">${header}</div>`;
    }
    
    fullHtml += content;
    
    if (footer && footer !== '<p></p>' && footer.trim() !== '') {
      fullHtml += `<div class="document-footer">${footer}</div>`;
    }

    // Renderizar com Paged.js
    const previewer = new Previewer();
    const flow = await previewer.preview(
      fullHtml,
      ['/src/components/contratos/editor/paged-styles.css'],
      container
    );

    // Aguardar renderização completa
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capturar páginas
    const pages = container.querySelectorAll('.pagedjs_page');
    
    if (pages.length === 0) {
      throw new Error('Nenhuma página foi gerada pelo Paged.js');
    }

    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // A4 dimensions in mm
    const pageWidth = 210;
    const pageHeight = 297;

    // Processar cada página
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i] as HTMLElement;
      
      // Adicionar nova página (exceto na primeira)
      if (i > 0) {
        pdf.addPage();
      }

      try {
        // Capturar página como canvas
        const canvas = await html2canvas(page, {
          scale: 2, // Melhor qualidade
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794, // 21cm em pixels (96 DPI)
          windowHeight: 1123 // 29.7cm em pixels (96 DPI)
        });

        // Converter para imagem
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        // Adicionar ao PDF
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      } catch (err) {
        console.error(`Erro ao processar página ${i + 1}:`, err);
      }
    }

    // Fazer download
    pdf.save(filename);

  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw error;
  } finally {
    // Remover container temporário
    document.body.removeChild(container);
  }
}

/**
 * Exporta para PDF usando window.print() com CSS otimizado
 * Alternativa mais rápida mas com menos controle
 */
export function printToPDF(): void {
  // Adicionar classe para impressão
  document.body.classList.add('printing');

  // Criar estilo temporário para impressão
  const style = document.createElement('style');
  style.id = 'print-pdf-styles';
  style.textContent = `
    @media print {
      @page {
        size: A4;
        margin: 0;
      }
      
      /* Ocultar elementos de UI */
      .no-print,
      button,
      .toolbar,
      .floating-toolbar,
      .zoom-controls,
      header,
      nav,
      aside {
        display: none !important;
      }
      
      /* Garantir quebras de página */
      .pagedjs_page {
        page-break-after: always;
        break-after: page;
      }
      
      /* Última página não quebra */
      .pagedjs_page:last-child {
        page-break-after: auto;
        break-after: auto;
      }
      
      /* Forçar fundo branco */
      body, .pagedjs_page {
        background: white !important;
      }
      
      /* Remover sombras e bordas */
      * {
        box-shadow: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  // Disparar impressão
  window.print();

  // Limpar após impressão
  setTimeout(() => {
    document.body.classList.remove('printing');
    const styleEl = document.getElementById('print-pdf-styles');
    if (styleEl) {
      document.head.removeChild(styleEl);
    }
  }, 100);
}

/**
 * Verifica se o navegador suporta html2canvas e jsPDF
 */
export function isPDFExportSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof document.createElement === 'function';
}
