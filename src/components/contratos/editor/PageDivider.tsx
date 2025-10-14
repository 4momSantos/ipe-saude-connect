interface PageDividerProps {
  zoom: number;
}

export function PageDivider({ zoom }: PageDividerProps) {
  return (
    <div 
      className="page-divider-container relative mx-auto"
      style={{
        width: `${21 * zoom}cm`,
        height: `${0.3 * zoom}cm`,
        marginBottom: `${0.2 * zoom}cm`,
        background: 'transparent',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {/* Linha horizontal minimalista estilo Google Docs */}
      <div 
        className="w-full"
        style={{ 
          height: '1px',
          background: 'rgba(0, 0, 0, 0.08)',
          margin: '0 auto'
        }} 
      />
    </div>
  );
}
