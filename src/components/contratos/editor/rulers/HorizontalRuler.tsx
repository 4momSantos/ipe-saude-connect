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
      className="ruler-horizontal sticky bg-gray-100 border-b border-gray-300 z-30 select-none cursor-default"
      style={{ 
        height: '30px',
        width: `${21 * zoom}cm`,
        margin: '0 auto',
        top: '48px'
      }}
      onClick={handleRulerClick}
    >
      <div className="relative h-full max-w-full">
        {Array.from({ length: 43 }, (_, i) => i * 0.5).map((cm) => {
          const isFullCm = cm % 1 === 0;
          return (
            <div
              key={cm}
              className="absolute"
              style={{ 
                left: `${(cm / 21) * 100}%`,
                top: 0,
                height: '30px'
              }}
            >
              <div 
                className={`w-px ${isFullCm ? 'h-4 bg-gray-600' : 'h-2 bg-gray-400'}`}
                style={{ position: 'absolute', top: 0 }}
              />
              
              {isFullCm && (
                <span 
                  className="text-[10px] text-gray-700 font-mono absolute"
                  style={{ top: '18px', transform: 'translateX(-50%)', left: 0 }}
                >
                  {cm}
                </span>
              )}
            </div>
          );
        })}
        
        {/* Indicador de margem esquerda */}
        <div
          className="absolute cursor-ew-resize group"
          style={{ 
            left: `${(leftMargin / 21) * 100}%`,
            top: 0,
            transform: 'translateX(-50%)',
            height: '100%'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingLeft(true);
          }}
        >
          <div className="w-px h-full bg-blue-500" />
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <svg width="12" height="8" className="group-hover:scale-110 transition-transform">
              <polygon points="0,8 6,0 12,8" fill="#3b82f6" />
            </svg>
          </div>
          
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {leftMargin.toFixed(1)}cm
          </div>
        </div>
        
        {/* Indicador de margem direita */}
        <div
          className="absolute cursor-ew-resize group"
          style={{ 
            left: `${(rightMargin / 21) * 100}%`,
            top: 0,
            transform: 'translateX(-50%)',
            height: '100%'
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingRight(true);
          }}
        >
          <div className="w-px h-full bg-blue-500" />
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2">
            <svg width="12" height="8" className="group-hover:scale-110 transition-transform">
              <polygon points="0,8 6,0 12,8" fill="#3b82f6" />
            </svg>
          </div>
          
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            {rightMargin.toFixed(1)}cm
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
