import { forwardRef } from 'react';

interface A4PageProps {
  children: React.ReactNode;
  pageNumber?: number;
  totalPages?: number;
  showPageNumber?: boolean;
  pageNumberPosition?: 'left' | 'center' | 'right';
  pageNumberFormat?: string;
  zoom: number;
}

export const A4Page = forwardRef<HTMLDivElement, A4PageProps>(({
  children,
  pageNumber,
  totalPages,
  showPageNumber = false,
  pageNumberPosition = 'center',
  pageNumberFormat = 'Página {n} de {total}',
  zoom
}, ref) => {
  const formatPageNumber = () => {
    return pageNumberFormat
      .replace('{n}', String(pageNumber))
      .replace('{total}', String(totalPages));
  };

  const positionClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  return (
    <div
      ref={ref}
      className="a4-page bg-white shadow-lg mx-auto mb-6 relative"
      style={{
        width: `${21 * zoom}cm`,
        minHeight: `${29.7 * zoom}cm`,
        padding: `${2 * zoom}cm`,
        transformOrigin: 'top center',
      }}
    >
      {/* Margens visíveis (opcional) */}
      <div 
        className="absolute inset-0 pointer-events-none border-[1px] border-dashed border-gray-300 opacity-30" 
        style={{ margin: `${2 * zoom}cm` }} 
      />

      {/* Conteúdo */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Numeração de Página */}
      {showPageNumber && pageNumber && (
        <div 
          className={`absolute bottom-4 left-0 right-0 flex ${positionClasses[pageNumberPosition]} px-8`}
          style={{ fontSize: `${12 * zoom}px` }}
        >
          <span className="text-muted-foreground font-medium">
            {formatPageNumber()}
          </span>
        </div>
      )}
    </div>
  );
});

A4Page.displayName = 'A4Page';
