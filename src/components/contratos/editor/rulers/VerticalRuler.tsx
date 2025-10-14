import { useState, useEffect, useRef } from 'react';

interface VerticalRulerProps {
  zoom: number;
  topMargin: number;
  bottomMargin: number;
  onTopMarginChange: (cm: number) => void;
  onBottomMarginChange: (cm: number) => void;
  visible?: boolean;
  scrollOffset?: number;
}

export function VerticalRuler({
  zoom,
  topMargin,
  bottomMargin,
  onTopMarginChange,
  onBottomMarginChange,
  visible = true,
  scrollOffset = 0
}: VerticalRulerProps) {
  const [isDraggingTop, setIsDraggingTop] = useState(false);
  const [isDraggingBottom, setIsDraggingBottom] = useState(false);
  
  const rulerRef = useRef<HTMLDivElement>(null);
  
  const pixelsToCm = (pixels: number) => {
    if (!rulerRef.current) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    return (pixels - rect.top) / rect.height * 29.7;
  };
  
  const handleTopMarginDrag = (e: MouseEvent) => {
    const cm = Math.max(0, Math.min(bottomMargin - 1, pixelsToCm(e.clientY)));
    onTopMarginChange(Math.round(cm * 10) / 10);
  };
  
  const handleBottomMarginDrag = (e: MouseEvent) => {
    const totalHeight = 29.7;
    const cm = Math.max(topMargin + 1, Math.min(totalHeight, pixelsToCm(e.clientY)));
    onBottomMarginChange(Math.round(cm * 10) / 10);
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingTop) handleTopMarginDrag(e);
      if (isDraggingBottom) handleBottomMarginDrag(e);
    };
    
    const handleMouseUp = () => {
      setIsDraggingTop(false);
      setIsDraggingBottom(false);
    };
    
    if (isDraggingTop || isDraggingBottom) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingTop, isDraggingBottom, topMargin, bottomMargin]);
  
  if (!visible) return null;
  
  return (
    <div 
      ref={rulerRef}
      className="ruler-vertical absolute bg-white border-r-2 border-gray-400 z-20 select-none shadow-sm"
      style={{ 
        width: '32px',
        height: `${29.7 * zoom}cm`,
        left: '-32px',
        top: 0
      }}
    >
      <div className="relative w-full h-full">
        {Array.from({ length: 60 }, (_, i) => i * 0.5).map((cm) => {
          const isFullCm = cm % 1 === 0;
          return (
            <div
              key={cm}
              className="absolute"
              style={{ 
                top: `${(cm / 29.7) * 100}%`,
                left: 0,
                width: '32px'
              }}
            >
              <div 
                className={`h-px ${isFullCm ? 'w-5 bg-gray-700' : 'w-3 bg-gray-500'}`}
                style={{ position: 'absolute', left: 0 }}
              />
              
              {isFullCm && (
                <span 
                  className="text-[11px] text-gray-800 font-semibold font-mono absolute"
                  style={{ 
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed'
                  }}
                >
                  {cm}
                </span>
              )}
            </div>
          );
        })}
        
        {/* Indicador de margem topo */}
        <div
          className="absolute cursor-ns-resize group z-10"
          style={{ 
            top: `${(topMargin / 29.7) * 100}%`,
            left: 0,
            transform: 'translateY(-50%)',
            width: '100%'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingTop(true);
          }}
        >
          <div className="h-0.5 w-full bg-blue-600 shadow-sm" />
          
          <div className="absolute top-1/2 left-0 -translate-y-1/2">
            <svg width="10" height="14" className="group-hover:scale-110 transition-transform drop-shadow-md">
              <polygon points="10,0 0,7 10,14" fill="#2563eb" />
            </svg>
          </div>
          
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Margem: {topMargin.toFixed(1)}cm
          </div>
        </div>
        
        {/* Indicador de margem fundo */}
        <div
          className="absolute cursor-ns-resize group z-10"
          style={{ 
            top: `${(bottomMargin / 29.7) * 100}%`,
            left: 0,
            transform: 'translateY(-50%)',
            width: '100%'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingBottom(true);
          }}
        >
          <div className="h-0.5 w-full bg-blue-600 shadow-sm" />
          
          <div className="absolute top-1/2 left-0 -translate-y-1/2">
            <svg width="10" height="14" className="group-hover:scale-110 transition-transform drop-shadow-md">
              <polygon points="10,0 0,7 10,14" fill="#2563eb" />
            </svg>
          </div>
          
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Margem: {(29.7 - bottomMargin).toFixed(1)}cm
          </div>
        </div>
      </div>
    </div>
  );
}
