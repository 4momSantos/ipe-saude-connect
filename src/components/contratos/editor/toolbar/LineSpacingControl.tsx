import { useState } from 'react';
import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { AlignVerticalSpaceAround } from 'lucide-react';

interface LineSpacingControlProps {
  editor: Editor;
}

const LINE_HEIGHT_PRESETS = [
  { value: '1.0', label: '1.0 - Simples' },
  { value: '1.15', label: '1.15 - Padrão Office' },
  { value: '1.5', label: '1.5 - Um e meio' },
  { value: '2.0', label: '2.0 - Duplo' },
  { value: '2.5', label: '2.5' },
  { value: '3.0', label: '3.0 - Triplo' },
];

const PARAGRAPH_SPACING_PRESETS = [
  { value: '0', label: 'Nenhum' },
  { value: '6', label: 'Pequeno' },
  { value: '12', label: 'Médio' },
  { value: '18', label: 'Grande' },
];

export function LineSpacingControl({ editor }: LineSpacingControlProps) {
  const [open, setOpen] = useState(false);
  
  // Pegar valores atuais
  const currentLineHeight = editor.getAttributes('paragraph').lineHeight || '1.5';
  const currentSpaceBefore = editor.getAttributes('paragraph').spaceBefore || '0';
  const currentSpaceAfter = editor.getAttributes('paragraph').spaceAfter || '0';

  const [customLineHeight, setCustomLineHeight] = useState(currentLineHeight);
  const [spaceBefore, setSpaceBefore] = useState(currentSpaceBefore);
  const [spaceAfter, setSpaceAfter] = useState(currentSpaceAfter);

  const handleLineHeightChange = (value: string) => {
    setCustomLineHeight(value);
    editor.chain().focus().setLineHeight(value).run();
  };

  const handleSpaceBeforeChange = (value: string) => {
    setSpaceBefore(value);
    editor.chain().focus().setSpaceBefore(value).run();
  };

  const handleSpaceAfterChange = (value: string) => {
    setSpaceAfter(value);
    editor.chain().focus().setSpaceAfter(value).run();
  };

  const applyToWholeDocument = () => {
    const { doc } = editor.state;
    const { tr } = editor.state;
    
    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          lineHeight: customLineHeight,
          spaceBefore: spaceBefore,
          spaceAfter: spaceAfter,
        });
      }
    });
    
    editor.view.dispatch(tr);
    editor.commands.focus();
  };

  const resetToDefault = () => {
    setCustomLineHeight('1.5');
    setSpaceBefore('0');
    setSpaceAfter('0');
    editor.chain().focus().setLineHeight('1.5').run();
    editor.chain().focus().setSpaceBefore('0').run();
    editor.chain().focus().setSpaceAfter('0').run();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          title="Espaçamento de Linhas"
        >
          <AlignVerticalSpaceAround className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-3">Espaçamento de Linhas</h4>
            
            {/* Presets de Line Height */}
            <div className="space-y-2">
              {LINE_HEIGHT_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  variant={customLineHeight === preset.value ? 'default' : 'outline'}
                  size="sm"
                  className="w-full justify-start text-sm"
                  onClick={() => handleLineHeightChange(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Slider customizado */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Customizado</Label>
                <Input
                  type="number"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={customLineHeight}
                  onChange={(e) => handleLineHeightChange(e.target.value)}
                  className="w-20 h-7 text-xs"
                />
              </div>
              <Slider
                value={[parseFloat(customLineHeight)]}
                onValueChange={([value]) => handleLineHeightChange(value.toFixed(1))}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>
          </div>

          <Separator />

          {/* Espaçamento entre Parágrafos */}
          <div>
            <h4 className="font-medium text-sm mb-3">Espaçamento entre Parágrafos</h4>
            
            {/* Espaço Antes */}
            <div className="space-y-2">
              <Label className="text-xs">Espaço Antes (pt)</Label>
              <div className="flex gap-2">
                {PARAGRAPH_SPACING_PRESETS.map((preset) => (
                  <Button
                    key={`before-${preset.value}`}
                    variant={spaceBefore === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleSpaceBeforeChange(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                min="0"
                max="24"
                value={spaceBefore}
                onChange={(e) => handleSpaceBeforeChange(e.target.value)}
                className="h-7 text-xs"
              />
            </div>

            {/* Espaço Depois */}
            <div className="space-y-2 mt-3">
              <Label className="text-xs">Espaço Depois (pt)</Label>
              <div className="flex gap-2">
                {PARAGRAPH_SPACING_PRESETS.map((preset) => (
                  <Button
                    key={`after-${preset.value}`}
                    variant={spaceAfter === preset.value ? 'default' : 'outline'}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleSpaceAfterChange(preset.value)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                min="0"
                max="24"
                value={spaceAfter}
                onChange={(e) => handleSpaceAfterChange(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>

          <Separator />

          {/* Ações */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={applyToWholeDocument}
            >
              Aplicar a Todo Documento
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefault}
            >
              Redefinir
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
