import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, Trash } from 'lucide-react';

interface ImageToolbarProps {
  node: any;
  updateAttributes: (attrs: any) => void;
  onDelete: () => void;
}

export const ImageToolbar = ({ node, updateAttributes, onDelete }: ImageToolbarProps) => {
  const presetSizes = [
    { label: 'P', width: 300, tooltip: 'Pequena (300px)' },
    { label: 'M', width: 500, tooltip: 'Média (500px)' },
    { label: 'G', width: 700, tooltip: 'Grande (700px)' },
    { label: 'Max', width: 1000, tooltip: 'Máxima (1000px)' },
  ];

  const handleAddLink = () => {
    const url = window.prompt('URL do link:', node.attrs.link || '');
    if (url !== null) {
      updateAttributes({ link: url });
    }
  };

  return (
    <TooltipProvider>
      <div className="image-toolbar">
        {/* Alinhamento */}
        <div className="toolbar-group">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={node.attrs.align === 'left' ? 'default' : 'ghost'}
                onClick={(e) => {
                  e.stopPropagation();
                  updateAttributes({ align: 'left' });
                }}
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alinhar à esquerda</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={node.attrs.align === 'center' ? 'default' : 'ghost'}
                onClick={(e) => {
                  e.stopPropagation();
                  updateAttributes({ align: 'center' });
                }}
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Centralizar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={node.attrs.align === 'right' ? 'default' : 'ghost'}
                onClick={(e) => {
                  e.stopPropagation();
                  updateAttributes({ align: 'right' });
                }}
              >
                <AlignRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Alinhar à direita</TooltipContent>
          </Tooltip>
        </div>

        {/* Tamanhos Predefinidos */}
        <div className="toolbar-group">
          {presetSizes.map(({ label, width, tooltip }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateAttributes({ width });
                  }}
                >
                  {label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* Link */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={(e) => {
                e.stopPropagation();
                handleAddLink();
              }}
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Adicionar link</TooltipContent>
        </Tooltip>

        {/* Deletar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Deletar imagem</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
