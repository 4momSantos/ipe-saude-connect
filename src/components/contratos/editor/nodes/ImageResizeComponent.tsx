import { NodeViewWrapper } from '@tiptap/react';
import { Resizable } from 're-resizable';
import { useState, useEffect } from 'react';
import { ImageToolbar } from './ImageToolbar';

export const ImageResizeComponent = ({ node, updateAttributes, deleteNode, selected }: any) => {
  const [isSelected, setIsSelected] = useState(false);
  const [size, setSize] = useState({
    width: node.attrs.width || 600,
    height: node.attrs.height || 'auto',
  });

  useEffect(() => {
    setIsSelected(selected);
  }, [selected]);

  const handleResize = (_e: any, _direction: any, ref: any) => {
    const newWidth = parseInt(ref.style.width);
    
    // Calcular altura proporcional
    const img = new Image();
    img.src = node.attrs.src;
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const newHeight = newWidth / aspectRatio;
      
      setSize({ width: newWidth, height: newHeight });
      updateAttributes({ width: newWidth, height: newHeight });
    };
  };

  return (
    <NodeViewWrapper className="image-node-wrapper">
      <div 
        className={`image-container ${isSelected ? 'selected' : ''}`}
        onClick={() => setIsSelected(true)}
        onBlur={() => setIsSelected(false)}
        style={{ textAlign: node.attrs.align }}
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
            right: { right: -5, cursor: 'ew-resize' },
            left: { left: -5, cursor: 'ew-resize' },
            topRight: { top: -5, right: -5, cursor: 'ne-resize' },
            bottomRight: { bottom: -5, right: -5, cursor: 'se-resize' },
            bottomLeft: { bottom: -5, left: -5, cursor: 'sw-resize' },
            topLeft: { top: -5, left: -5, cursor: 'nw-resize' },
          }}
        >
          <img
            src={node.attrs.src}
            alt={node.attrs.alt || ''}
            style={{ width: '100%', height: 'auto', display: 'block' }}
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
