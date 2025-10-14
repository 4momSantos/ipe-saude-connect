import { ReactNode } from 'react';
import { PageDivider } from './PageDivider';

interface A4PageWrapperProps {
  children: ReactNode;
  pageNumber: number;
  totalPages: number;
  zoom: number;
  isLastPage: boolean;
  showPageNumber?: boolean;
  pageNumberPosition?: 'left' | 'center' | 'right';
  pageNumberFormat?: string;
  startNumber?: number;
  fontFamily?: string;
  fontSize?: number;
}

export function A4PageWrapper({
  children,
  pageNumber,
  totalPages,
  zoom,
  isLastPage,
  showPageNumber = true,
  pageNumberPosition = 'center',
  pageNumberFormat = 'Página {n} de {total}',
  startNumber = 1,
  fontFamily = 'Arial',
  fontSize = 10,
}: A4PageWrapperProps) {
  
  const formatPageNumber = (n: number) => {
    return pageNumberFormat
      .replace('{n}', String(n))
      .replace('{total}', String(totalPages));
  };

  const getPositionClass = () => {
    switch (pageNumberPosition) {
      case 'left': return 'text-left';
      case 'right': return 'text-right';
      default: return 'text-center';
    }
  };

  return (
    <>
      <div
        className="a4-page-wrapper bg-white shadow-lg mx-auto relative"
        style={{
          width: `${21 * zoom}cm`,
          height: `${29.7 * zoom}cm`,
          paddingTop: `${2.5 * zoom}cm`,
          paddingBottom: `${2.5 * zoom}cm`,
          paddingLeft: `${3 * zoom}cm`,
          paddingRight: `${3 * zoom}cm`,
          marginBottom: isLastPage ? 0 : `${2 * zoom}cm`,
        }}
      >
        {/* Indicador de margens (sutil) */}
        <div 
          className="page-margins-indicator"
          style={{
            position: 'absolute',
            top: `${2.5 * zoom}cm`,
            bottom: `${2.5 * zoom}cm`,
            left: `${3 * zoom}cm`,
            right: `${3 * zoom}cm`,
            border: '1px dashed rgba(0, 0, 0, 0.08)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />

        {/* Conteúdo editável */}
        <div className="relative z-10 h-full">
          {children}
        </div>

        {/* Numeração de página */}
        {showPageNumber && (
          <div 
            className={`absolute bottom-0 left-0 right-0 pb-4 ${getPositionClass()}`}
            style={{
              paddingLeft: `${3 * zoom}cm`,
              paddingRight: `${3 * zoom}cm`,
            }}
          >
            <span 
              className="text-muted-foreground font-medium"
              style={{
                fontFamily: fontFamily,
                fontSize: `${fontSize * zoom}pt`,
              }}
            >
              {formatPageNumber(pageNumber + startNumber - 1)}
            </span>
          </div>
        )}
      </div>

      {/* Linha divisória entre páginas */}
      {!isLastPage && <PageDivider zoom={zoom} />}
    </>
  );
}
