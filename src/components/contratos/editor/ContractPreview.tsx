import { useEffect, useRef } from "react";
import "./print-styles.css";

interface ContractPreviewProps {
  content: string;
  headerContent?: string;
  footerContent?: string;
  className?: string;
}

export function ContractPreview({ 
  content, 
  headerContent = "", 
  footerContent = "",
  className = "" 
}: ContractPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Aplicar estilos de página A4
    if (contentRef.current) {
      contentRef.current.style.width = "210mm";
      contentRef.current.style.minHeight = "297mm";
      contentRef.current.style.padding = "20mm";
      contentRef.current.style.margin = "0 auto";
      contentRef.current.style.backgroundColor = "white";
      contentRef.current.style.boxShadow = "0 0 10px rgba(0,0,0,0.1)";
    }
  }, []);

  return (
    <div className={`contract-preview bg-muted py-8 ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .contract-page, .contract-page * {
            visibility: visible;
          }
          .contract-page {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            margin: 0;
            box-shadow: none;
          }
          .contract-preview {
            background: white !important;
            padding: 0 !important;
          }
        }
      `}} />
      
      <div ref={contentRef} className="contract-page contrato-juridico">
        {/* Cabeçalho */}
        {headerContent && (
          <div 
            className="contract-header mb-6 pb-4 border-b"
            dangerouslySetInnerHTML={{ __html: headerContent }}
          />
        )}

        {/* Conteúdo Principal */}
        <div 
          className="contract-content prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Rodapé */}
        {footerContent && (
          <div 
            className="contract-footer mt-6 pt-4 border-t"
            dangerouslySetInnerHTML={{ __html: footerContent }}
          />
        )}
      </div>
    </div>
  );
}
