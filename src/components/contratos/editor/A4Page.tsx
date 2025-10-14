import { forwardRef } from 'react';

interface A4PageProps {
  children: React.ReactNode;
  pageNumber?: number;
  totalPages?: number;
  showPageNumber?: boolean;
  pageNumberPosition?: 'left' | 'center' | 'right';
  pageNumberFormat?: string;
  zoom: number;
  isLastPage?: boolean;
  startNumber?: number;
  fontFamily?: string;
  fontSize?: number;
}

export const A4Page = forwardRef<HTMLDivElement, A4PageProps>(({
  children,
  pageNumber,
  totalPages,
  showPageNumber = false,
  pageNumberPosition = 'center',
  pageNumberFormat = 'Página {n} de {total}',
  zoom,
  isLastPage = false,
  startNumber = 1,
  fontFamily = 'Arial',
  fontSize = 10
}, ref) => {
  const formatPageNumber = () => {
    const actualPageNumber = pageNumber ? pageNumber + startNumber - 1 : startNumber;
    return pageNumberFormat
      .replace('{n}', String(actualPageNumber))
      .replace('{total}', String(totalPages));
  };

  const positionClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  return (
    <>
      <div
        ref={ref}
        className="a4-page bg-white shadow-lg mx-auto relative overflow-hidden"
        style={{
          width: `${21 * zoom}cm`,
          height: `${29.7 * zoom}cm`,
          paddingTop: `${2.5 * zoom}cm`,
          paddingBottom: `${2.5 * zoom}cm`,
          paddingLeft: `${3 * zoom}cm`,
          paddingRight: `${3 * zoom}cm`,
          transformOrigin: 'top center',
          marginBottom: isLastPage ? 0 : `${2 * zoom}cm`,
        }}
      >
        {/* Margens visíveis (opcional) */}
        <div 
          className="absolute inset-0 pointer-events-none border-[1px] border-dashed border-gray-300 opacity-30" 
          style={{ 
            top: `${2.5 * zoom}cm`,
            bottom: `${2.5 * zoom}cm`,
            left: `${3 * zoom}cm`,
            right: `${3 * zoom}cm`,
          }} 
        />

        {/* Conteúdo */}
        <div className="relative z-10 h-full">
          {children}
        </div>

        {/* Numeração de Página */}
        {showPageNumber && pageNumber && (
          <div 
            className={`absolute bottom-4 left-0 right-0 flex ${positionClasses[pageNumberPosition]} px-8`}
          >
            <span 
              className="text-muted-foreground font-medium"
              style={{
                fontFamily: fontFamily,
                fontSize: `${fontSize * zoom}pt`,
              }}
            >
              {formatPageNumber()}
            </span>
          </div>
        )}
      </div>

      {/* Linha divisória entre páginas */}
      {!isLastPage && (
        <div 
          className="page-divider relative flex flex-col items-center justify-center bg-gray-100 mx-auto"
          style={{
            width: `${21 * zoom}cm`,
            height: `${1 * zoom}cm`,
            marginBottom: `${1 * zoom}cm`,
          }}
        >
          <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
          <div 
            className="text-center text-muted-foreground font-mono mt-1"
            style={{ fontSize: `${10 * zoom}px` }}
          >
            • • • QUEBRA DE PÁGINA • • •
          </div>
        </div>
      )}
    </>
  );
});

A4Page.displayName = 'A4Page';
