interface PageDividerProps {
  zoom: number;
}

export function PageDivider({ zoom }: PageDividerProps) {
  return (
    <div 
      className="page-divider-container relative flex flex-col items-center justify-center bg-gray-100 mx-auto"
      style={{
        width: `${21 * zoom}cm`,
        height: `${1 * zoom}cm`,
        marginBottom: `${1 * zoom}cm`,
      }}
    >
      {/* Linha horizontal gradiente */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      
      {/* Texto indicador */}
      <div 
        className="text-center text-muted-foreground font-mono mt-1"
        style={{ fontSize: `${10 * zoom}px` }}
      >
        • • • QUEBRA DE PÁGINA • • •
      </div>
    </div>
  );
}
