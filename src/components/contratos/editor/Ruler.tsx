export function HorizontalRuler() {
  // Criar marcações de 0 a 21cm (largura A4)
  const marks = Array.from({ length: 22 }, (_, i) => i);

  return (
    <div className="ruler-horizontal sticky top-0 bg-white border-b border-border z-40 select-none">
      <div className="relative h-8 max-w-[21cm] mx-auto">
        {marks.map((cm) => (
          <div
            key={cm}
            className="absolute flex flex-col items-center"
            style={{ left: `${(cm / 21) * 100}%` }}
          >
            {/* Marcação principal (a cada 1cm) */}
            <div className="h-3 w-px bg-muted-foreground/40" />
            
            {/* Número (a cada 2cm) */}
            {cm % 2 === 0 && (
              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {cm}
              </span>
            )}
            
            {/* Mini marcações (a cada 0.5cm) */}
            {cm < 21 && (
              <div
                className="absolute h-1.5 w-px bg-muted-foreground/20"
                style={{ left: '50%', top: 0 }}
              />
            )}
          </div>
        ))}
        
        {/* Indicador de margem esquerda (2cm) */}
        <div
          className="absolute top-0 h-full w-px bg-primary/30"
          style={{ left: `${(2 / 21) * 100}%` }}
          title="Margem esquerda (2cm)"
        />
        
        {/* Indicador de margem direita (19cm) */}
        <div
          className="absolute top-0 h-full w-px bg-primary/30"
          style={{ left: `${(19 / 21) * 100}%` }}
          title="Margem direita (2cm)"
        />
      </div>
    </div>
  );
}
