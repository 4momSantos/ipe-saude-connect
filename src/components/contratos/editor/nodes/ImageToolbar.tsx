import { Button } from '@/components/ui/button';
import { AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Trash, Upload } from 'lucide-react';

interface ImageToolbarProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  onDelete: () => void;
}

export const ImageToolbar = ({ node, updateAttributes, onDelete }: ImageToolbarProps) => {
  const presetSizes = [
    { label: 'P', width: 300 },
    { label: 'M', width: 500 },
    { label: 'G', width: 700 },
    { label: 'Max', width: 1000 },
  ];

  const handleAddLink = () => {
    const url = window.prompt('URL do link:', node.attrs.link || '');
    if (url !== null) {
      updateAttributes({ link: url });
    }
  };

  return (
    <div className="image-toolbar">
      {/* Alinhamento */}
      <div className="toolbar-group">
        <Button
          size="sm"
          variant={node.attrs.align === 'left' ? 'default' : 'ghost'}
          onClick={() => updateAttributes({ align: 'left' })}
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={node.attrs.align === 'center' ? 'default' : 'ghost'}
          onClick={() => updateAttributes({ align: 'center' })}
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={node.attrs.align === 'right' ? 'default' : 'ghost'}
          onClick={() => updateAttributes({ align: 'right' })}
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Tamanhos Predefinidos */}
      <div className="toolbar-group">
        {presetSizes.map(({ label, width }) => (
          <Button
            key={label}
            size="sm"
            variant="ghost"
            onClick={() => updateAttributes({ width })}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Link */}
      <Button size="sm" variant="ghost" onClick={handleAddLink}>
        <LinkIcon className="h-4 w-4" />
      </Button>

      {/* Deletar */}
      <Button size="sm" variant="destructive" onClick={onDelete}>
        <Trash className="h-4 w-4" />
      </Button>
    </div>
  );
};
