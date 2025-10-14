import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { FileText, RotateCcw } from 'lucide-react';

interface MarginsControlProps {
  leftMargin: number;
  rightMargin: number;
  topMargin: number;
  bottomMargin: number;
  onLeftMarginChange: (value: number) => void;
  onRightMarginChange: (value: number) => void;
  onTopMarginChange: (value: number) => void;
  onBottomMarginChange: (value: number) => void;
}

// Presets comuns de margens
const MARGIN_PRESETS = [
  { name: 'Padrão Word', top: 2.5, bottom: 2.5, left: 3, right: 3 },
  { name: 'Estreita', top: 1.27, bottom: 1.27, left: 1.27, right: 1.27 },
  { name: 'Moderada', top: 2.54, bottom: 2.54, left: 1.91, right: 1.91 },
  { name: 'Larga', top: 2.54, bottom: 2.54, left: 5.08, right: 5.08 },
];

export function MarginsControl({
  leftMargin,
  rightMargin,
  topMargin,
  bottomMargin,
  onLeftMarginChange,
  onRightMarginChange,
  onTopMarginChange,
  onBottomMarginChange,
}: MarginsControlProps) {
  const [tempLeft, setTempLeft] = useState(leftMargin.toString());
  const [tempRight, setTempRight] = useState(rightMargin.toString());
  const [tempTop, setTempTop] = useState(topMargin.toString());
  const [tempBottom, setTempBottom] = useState(bottomMargin.toString());

  const handleApply = () => {
    const left = parseFloat(tempLeft) || 3;
    const right = parseFloat(tempRight) || 3;
    const top = parseFloat(tempTop) || 2.5;
    const bottom = parseFloat(tempBottom) || 2.5;

    onLeftMarginChange(Math.max(0.5, Math.min(10, left)));
    onRightMarginChange(Math.max(0.5, Math.min(10, right)));
    onTopMarginChange(Math.max(0.5, Math.min(10, top)));
    onBottomMarginChange(Math.max(0.5, Math.min(10, bottom)));
  };

  const handlePreset = (preset: typeof MARGIN_PRESETS[0]) => {
    setTempTop(preset.top.toString());
    setTempBottom(preset.bottom.toString());
    setTempLeft(preset.left.toString());
    setTempRight(preset.right.toString());
    
    onTopMarginChange(preset.top);
    onBottomMarginChange(preset.bottom);
    onLeftMarginChange(preset.left);
    onRightMarginChange(preset.right);
  };

  const handleReset = () => {
    handlePreset(MARGIN_PRESETS[0]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <FileText className="h-4 w-4" />
          <span className="text-xs">Margens</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Configurar Margens</h4>
            <p className="text-xs text-muted-foreground">
              Ajuste as margens do documento em centímetros
            </p>
          </div>

          <Separator />

          {/* Presets rápidos */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              {MARGIN_PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => handlePreset(preset)}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Configurações personalizadas */}
          <div className="space-y-3">
            <Label className="text-xs font-medium">Personalizado (cm)</Label>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="top-margin" className="text-xs text-muted-foreground">
                  Superior
                </Label>
                <Input
                  id="top-margin"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={tempTop}
                  onChange={(e) => setTempTop(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bottom-margin" className="text-xs text-muted-foreground">
                  Inferior
                </Label>
                <Input
                  id="bottom-margin"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={tempBottom}
                  onChange={(e) => setTempBottom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="left-margin" className="text-xs text-muted-foreground">
                  Esquerda
                </Label>
                <Input
                  id="left-margin"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={tempLeft}
                  onChange={(e) => setTempLeft(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="right-margin" className="text-xs text-muted-foreground">
                  Direita
                </Label>
                <Input
                  id="right-margin"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="10"
                  value={tempRight}
                  onChange={(e) => setTempRight(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Botões de ação */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleReset}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Redefinir
            </Button>
            <Button
              size="sm"
              className="flex-1 h-8 text-xs"
              onClick={handleApply}
            >
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
