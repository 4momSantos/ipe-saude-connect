import { NodeViewWrapper } from '@tiptap/react';
import { Resizable } from 're-resizable';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageToolbar } from './ImageToolbar';

export const ImageResizeComponent = ({ node, updateAttributes, deleteNode, selected }: any) => {
  const [isSelected, setIsSelected] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState({
    width: typeof node.attrs.width === 'number' ? node.attrs.width : 600,
    height: node.attrs.height || 'auto',
  });

  useEffect(() => {
    setIsSelected(selected);
  }, [selected]);

  const handleResize = useCallback((_e: any, _direction: any, ref: HTMLElement) => {
    const newWidth = parseInt(ref.style.width);
    
    if (imageRef.current) {
      const aspectRatio = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
      const newHeight = Math.round(newWidth / aspectRatio);
      
      setSize({ width: newWidth, height: newHeight });
      
      // Atualizar atributos sem causar re-render do editor
      requestAnimationFrame(() => {
        updateAttributes({ width: newWidth, height: newHeight });
      });
    }
  }, [updateAttributes]);

  return (
    <NodeViewWrapper className="image-node-wrapper">
      <div 
        className={`image-container ${isSelected ? 'selected' : ''}`}
        data-align={node.attrs.align || 'center'}
        onClick={() => setIsSelected(true)}
        onBlur={() => setIsSelected(false)}
      >
        {isSelected && (
          <ImageToolbar
            node={node}
            updateAttributes={updateAttributes}
            onDelete={deleteNode}
          />
        )}

        <Resizable
          size={{ width: size.width, height: size.height }}
          onResizeStop={handleResize}
          lockAspectRatio
          maxWidth="100%"
          minWidth={100}
          enable={{
            top: false,
            right: isSelected,
            bottom: false,
            left: isSelected,
            topRight: isSelected,
            bottomRight: isSelected,
            bottomLeft: isSelected,
            topLeft: isSelected,
          }}
          handleStyles={{
            right: { right: -5, cursor: 'ew-resize', width: 8, height: 8 },
            left: { left: -5, cursor: 'ew-resize', width: 8, height: 8 },
            topRight: { top: -5, right: -5, cursor: 'ne-resize', width: 8, height: 8 },
            bottomRight: { bottom: -5, right: -5, cursor: 'se-resize', width: 8, height: 8 },
            bottomLeft: { bottom: -5, left: -5, cursor: 'sw-resize', width: 8, height: 8 },
            topLeft: { top: -5, left: -5, cursor: 'nw-resize', width: 8, height: 8 },
          }}
        >
          <img
            ref={imageRef}
            src={node.attrs.src}
            alt={node.attrs.alt || ''}
            style={{ 
              width: '100%', 
              height: 'auto', 
              display: 'block', 
              margin: '0 auto',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          />
        </Resizable>

        {isSelected && (
          <div className="image-dimensions">
            {size.width}px × {Math.round(size.height as number)}px
          </div>
        )}

        <input
          type="text"
          placeholder="Adicione uma legenda..."
          value={node.attrs.caption || ''}
          onChange={(e) => updateAttributes({ caption: e.target.value })}
          className="image-caption-input"
        />
      </div>
    </NodeViewWrapper>
  );
};
