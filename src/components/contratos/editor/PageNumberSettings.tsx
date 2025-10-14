import { Button } from "@/components/ui/button";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Hash } from "lucide-react";

interface PageNumberSettingsProps {
  showPageNumbers: boolean;
  position: 'left' | 'center' | 'right';
  format: string;
  startNumber?: number;
  fontFamily?: string;
  fontSize?: number;
  onShowChange: (show: boolean) => void;
  onPositionChange: (pos: 'left' | 'center' | 'right') => void;
  onFormatChange: (format: string) => void;
  onStartNumberChange?: (num: number) => void;
  onFontFamilyChange?: (font: string) => void;
  onFontSizeChange?: (size: number) => void;
}

export function PageNumberSettings({
  showPageNumbers,
  position,
  format,
  startNumber = 1,
  fontFamily = 'Arial',
  fontSize = 10,
  onShowChange,
  onPositionChange,
  onFormatChange,
  onStartNumberChange,
  onFontFamilyChange,
  onFontSizeChange
}: PageNumberSettingsProps) {
  const presetFormats = [
    { label: "Página X de Y", value: "Página {n} de {total}" },
    { label: "Apenas número", value: "{n}" },
    { label: "X / Y", value: "{n} / {total}" },
    { label: "Página X", value: "Página {n}" },
    { label: "- X -", value: "- {n} -" },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Hash className="h-4 w-4 mr-2" />
          Numeração
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-base font-semibold">Numeração de Páginas</Label>
          </div>

          {/* Ativar/Desativar */}
          <div className="flex items-center justify-between">
            <Label htmlFor="show-numbers">Mostrar numeração</Label>
            <Switch
              id="show-numbers"
              checked={showPageNumbers}
              onCheckedChange={onShowChange}
            />
          </div>

          {showPageNumbers && (
            <>
              {/* Posição */}
              <div className="space-y-2">
                <Label>Posição</Label>
                <Select value={position} onValueChange={onPositionChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Esquerda</SelectItem>
                    <SelectItem value="center">Centro</SelectItem>
                    <SelectItem value="right">Direita</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Formato */}
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select value={format} onValueChange={onFormatChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presetFormats.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Format */}
              <div className="space-y-2">
                <Label>Formato personalizado</Label>
                <Input
                  value={format}
                  onChange={(e) => onFormatChange(e.target.value)}
                  placeholder="Use {n} e {total}"
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use {"{n}"} para número da página e {"{total}"} para total
                </p>
              </div>

              {/* Número Inicial */}
              {onStartNumberChange && (
                <div className="space-y-2">
                  <Label>Começar em</Label>
                  <Input
                    type="number"
                    min={1}
                    value={startNumber}
                    onChange={(e) => onStartNumberChange(parseInt(e.target.value) || 1)}
                    className="text-sm"
                  />
                </div>
              )}

              {/* Fonte */}
              {onFontFamilyChange && (
                <div className="space-y-2">
                  <Label>Fonte</Label>
                  <Select value={fontFamily} onValueChange={onFontFamilyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Tamanho da Fonte */}
              {onFontSizeChange && (
                <div className="space-y-2">
                  <Label>Tamanho (pt)</Label>
                  <Input
                    type="number"
                    min={8}
                    max={16}
                    value={fontSize}
                    onChange={(e) => onFontSizeChange(parseInt(e.target.value) || 10)}
                    className="text-sm"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
