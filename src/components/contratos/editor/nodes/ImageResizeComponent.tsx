import { NodeViewWrapper } from '@tiptap/react';
import { Resizable } from 're-resizable';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ImageToolbar } from './ImageToolbar';

export const ImageResizeComponent = ({ node, updateAttributes, deleteNode, selected }: any) => {
  const [isSelected, setIsSelected] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({
    width: typeof node.attrs.width === 'number' ? node.attrs.width : 600,
    height: node.attrs.height || 'auto',
  });

  useEffect(() => {
    setIsSelected(selected);
  }, [selected]);

  // Detectar clique fora para fechar toolbar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSelected(false);
      }
    };

    if (isSelected) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelected]);

  const handleResize = useCallback((_e: any, _direction: any, ref: HTMLElement) => {
    const newWidth = parseInt(ref.style.width);
    
    if (imageRef.current) {
      const aspectRatio = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
      const newHeight = Math.round(newWidth / aspectRatio);
      
      setSize({ width: newWidth, height: newHeight });
      
      requestAnimationFrame(() => {
        updateAttributes({ width: newWidth, height: newHeight });
      });
    }
  }, [updateAttributes]);

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSelected(true);
  };

  return (
    <NodeViewWrapper className="image-node-wrapper">
      <div 
        ref={containerRef}
        className={`image-container ${isSelected ? 'selected' : ''}`}
        data-align={node.attrs.align || 'center'}
        onClick={handleContainerClick}
      >
        {isSelected && (
          <ImageToolbar
            node={node}
            updateAttributes={updateAttributes}
            onDelete={() => {
              setIsSelected(false);
              deleteNode();
            }}
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
          handleWrapperClass={isSelected ? 'resize-handles-visible' : 'resize-handles-hidden'}
          handleComponent={{
            right: <div className="react-resizable-handle react-resizable-handle-right" />,
            left: <div className="react-resizable-handle react-resizable-handle-left" />,
            topRight: <div className="react-resizable-handle react-resizable-handle-topRight" />,
            topLeft: <div className="react-resizable-handle react-resizable-handle-topLeft" />,
            bottomRight: <div className="react-resizable-handle react-resizable-handle-bottomRight" />,
            bottomLeft: <div className="react-resizable-handle react-resizable-handle-bottomLeft" />,
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
              cursor: 'pointer',
            }}
            onClick={handleContainerClick}
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
          onClick={(e) => e.stopPropagation()}
          className="image-caption-input"
        />
      </div>
    </NodeViewWrapper>
  );
};
