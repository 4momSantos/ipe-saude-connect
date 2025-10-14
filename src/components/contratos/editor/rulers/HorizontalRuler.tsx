import { useState, useEffect, useRef } from 'react';

interface HorizontalRulerProps {
  zoom: number;
  leftMargin: number;
  rightMargin: number;
  tabs: number[];
  onLeftMarginChange: (cm: number) => void;
  onRightMarginChange: (cm: number) => void;
  onTabsChange: (tabs: number[]) => void;
  visible?: boolean;
}

export function HorizontalRuler({
  zoom,
  leftMargin,
  rightMargin,
  tabs,
  onLeftMarginChange,
  onRightMarginChange,
  onTabsChange,
  visible = true
}: HorizontalRulerProps) {
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [draggingTabIndex, setDraggingTabIndex] = useState<number | null>(null);
  
  const rulerRef = useRef<HTMLDivElement>(null);
  
  const pixelsToCm = (pixels: number) => {
    if (!rulerRef.current) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    return (pixels - rect.left) / rect.width * 21;
  };
  
  const handleLeftMarginDrag = (e: MouseEvent) => {
    const cm = Math.max(0, Math.min(rightMargin - 1, pixelsToCm(e.clientX)));
    onLeftMarginChange(Math.round(cm * 10) / 10);
  };
  
  const handleRightMarginDrag = (e: MouseEvent) => {
    const cm = Math.max(leftMargin + 1, Math.min(21, pixelsToCm(e.clientX)));
    onRightMarginChange(Math.round(cm * 10) / 10);
  };
  
  const handleRulerClick = (e: React.MouseEvent) => {
    const cm = pixelsToCm(e.clientX);
    if (cm > leftMargin && cm < rightMargin) {
      const newTabs = [...tabs, Math.round(cm * 10) / 10].sort((a, b) => a - b);
      onTabsChange(newTabs);
    }
  };
  
  const handleTabDoubleClick = (index: number) => {
    const newTabs = tabs.filter((_, i) => i !== index);
    onTabsChange(newTabs);
  };
  
  const handleTabDrag = (e: MouseEvent) => {
    if (draggingTabIndex === null) return;
    const cm = Math.max(leftMargin, Math.min(rightMargin, pixelsToCm(e.clientX)));
    const newTabs = [...tabs];
    newTabs[draggingTabIndex] = Math.round(cm * 10) / 10;
    onTabsChange(newTabs.sort((a, b) => a - b));
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeft) handleLeftMarginDrag(e);
      if (isDraggingRight) handleRightMarginDrag(e);
      if (draggingTabIndex !== null) handleTabDrag(e);
    };
    
    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
      setDraggingTabIndex(null);
    };
    
    if (isDraggingLeft || isDraggingRight || draggingTabIndex !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingLeft, isDraggingRight, draggingTabIndex, leftMargin, rightMargin, tabs]);
  
  if (!visible) return null;
  
  return (
    <div 
      ref={rulerRef}
      className="ruler-horizontal sticky bg-white border-b-2 border-gray-400 z-30 select-none cursor-crosshair shadow-sm mx-auto"
      style={{ 
        height: '32px',
        width: `${21 * zoom}cm`,
        maxWidth: '95%',
        top: '0',
      }}
      onClick={handleRulerClick}
    >
      <div className="relative h-full w-full overflow-visible">
        {/* Marcações da régua */}
        {Array.from({ length: 22 }, (_, i) => i).map((cm) => {
          const isFullCm = true;
          const position = (cm / 21) * 100;
          
          return (
            <div
              key={cm}
              className="absolute"
              style={{ 
                left: `${position}%`,
                top: 0,
                height: '32px',
                transform: 'translateX(-0.5px)'
              }}
            >
              <div 
                className="w-px h-5 bg-gray-700"
                style={{ position: 'absolute', top: 0 }}
              />
              
              {isFullCm && cm <= 21 && (
                <span 
                  className="text-[11px] text-gray-800 font-semibold font-mono absolute pointer-events-none select-none"
                  style={{ 
                    top: '20px', 
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {cm}
                </span>
              )}
            </div>
          );
        })}
        
        {/* Marcações menores (0.5cm) */}
        {Array.from({ length: 42 }, (_, i) => i * 0.5).filter(cm => cm % 1 !== 0).map((cm) => {
          const position = (cm / 21) * 100;
          
          return (
            <div
              key={`half-${cm}`}
              className="absolute"
              style={{ 
                left: `${position}%`,
                top: 0,
                height: '32px',
                transform: 'translateX(-0.5px)'
              }}
            >
              <div 
                className="w-px h-3 bg-gray-500"
                style={{ position: 'absolute', top: 0 }}
              />
            </div>
          );
        })}
        
        {/* Indicador de margem esquerda */}
        <div
          className="absolute cursor-ew-resize group z-10"
          style={{ 
            left: `${(leftMargin / 21) * 100}%`,
            top: 0,
            height: '100%',
            width: '20px',
            transform: 'translateX(-10px)'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingLeft(true);
          }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-blue-600 shadow-sm" />
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <svg width="16" height="12" className="group-hover:scale-110 transition-transform drop-shadow-md">
              <polygon points="0,12 8,0 16,12" fill="#2563eb" />
            </svg>
          </div>
          
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Margem: {leftMargin.toFixed(1)}cm
          </div>
        </div>
        
        {/* Indicador de margem direita */}
        <div
          className="absolute cursor-ew-resize group z-10"
          style={{ 
            left: `${(rightMargin / 21) * 100}%`,
            top: 0,
            height: '100%',
            width: '20px',
            transform: 'translateX(-10px)'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingRight(true);
          }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-blue-600 shadow-sm" />
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <svg width="16" height="12" className="group-hover:scale-110 transition-transform drop-shadow-md">
              <polygon points="0,12 8,0 16,12" fill="#2563eb" />
            </svg>
          </div>
          
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Margem: {(21 - rightMargin).toFixed(1)}cm
          </div>
        </div>
        
        {/* Tabulações */}
        {tabs.map((tabCm, index) => (
          <div
            key={`tab-${index}`}
            className="absolute cursor-move group"
            style={{ 
              left: `${(tabCm / 21) * 100}%`,
              top: 0,
              transform: 'translateX(-50%)',
              height: '100%'
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDraggingTabIndex(index);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              handleTabDoubleClick(index);
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2">
              <svg width="10" height="8" className="group-hover:scale-110 transition-transform">
                <polygon points="0,0 5,8 10,0" fill="#6b7280" />
              </svg>
            </div>
            
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {tabCm.toFixed(1)}cm
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
