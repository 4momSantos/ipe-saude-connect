import { FormField, FieldType, FieldSize } from "@/types/workflow-editor";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { OCRConfigPanel } from "./OCRConfigPanel";

interface FieldConfigPanelProps {
  field: FormField | null;
  allFields: FormField[];
  onUpdateField: (updates: Partial<FormField>) => void;
  allWorkflowFields?: Array<FormField & { nodeName?: string }>;
}

export function FieldConfigPanel({ field, allFields, onUpdateField, allWorkflowFields = [] }: FieldConfigPanelProps) {
  if (!field) {
    return (
      <div className="w-80 bg-card border-l border-border overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-bold text-foreground mb-2">Configurações</h2>
          <p className="text-sm text-muted-foreground">
            Selecione um campo no editor para configurá-lo
          </p>
        </div>
      </div>
    );
  }

  const isAPIField = ['cpf', 'cnpj', 'crm', 'nit', 'cep'].includes(field.type);

  return (
    <div className="w-80 bg-card border-l border-border overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Configurações do Campo</h2>
        <p className="text-xs text-muted-foreground mt-1 capitalize">
          Tipo: {field.type}
        </p>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Basic Settings */}
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Label do Campo</Label>
            <Input
              value={field.label}
              onChange={(e) => onUpdateField({ label: e.target.value })}
              className="mt-1.5"
            />
          </div>

          {field.type !== 'checkbox' && (
            <div>
              <Label className="text-sm font-medium">Placeholder</Label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => onUpdateField({ placeholder: e.target.value })}
                placeholder="Ex: Digite seu nome"
                className="mt-1.5"
              />
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Tamanho do Campo</Label>
            <Select
              value={field.size}
              onValueChange={(value) => onUpdateField({ size: value as FieldSize })}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Largura Total</SelectItem>
                <SelectItem value="half">1/2 (50%)</SelectItem>
                <SelectItem value="third">1/3 (33%)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Texto de Ajuda</Label>
            <Input
              value={field.helpText || ''}
              onChange={(e) => onUpdateField({ helpText: e.target.value })}
              placeholder="Informação adicional"
              className="mt-1.5"
            />
          </div>
        </div>

        <Separator />

        {/* Validations */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Validações</h3>
          
          <div className="flex items-center justify-between">
            <Label className="text-sm">Campo Obrigatório</Label>
            <Switch
              checked={field.validation?.required || false}
              onCheckedChange={(checked) =>
                onUpdateField({
                  validation: { ...field.validation, required: checked }
                })
              }
            />
          </div>

          {(field.type === 'text' || field.type === 'textarea') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Mín. Caracteres</Label>
                <Input
                  type="number"
                  value={field.validation?.minLength || ''}
                  onChange={(e) =>
                    onUpdateField({
                      validation: { ...field.validation, minLength: parseInt(e.target.value) || undefined }
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Máx. Caracteres</Label>
                <Input
                  type="number"
                  value={field.validation?.maxLength || ''}
                  onChange={(e) =>
                    onUpdateField({
                      validation: { ...field.validation, maxLength: parseInt(e.target.value) || undefined }
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {field.type === 'number' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Valor Mínimo</Label>
                <Input
                  type="number"
                  value={field.validation?.min || ''}
                  onChange={(e) =>
                    onUpdateField({
                      validation: { ...field.validation, min: parseInt(e.target.value) || undefined }
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Valor Máximo</Label>
                <Input
                  type="number"
                  value={field.validation?.max || ''}
                  onChange={(e) =>
                    onUpdateField({
                      validation: { ...field.validation, max: parseInt(e.target.value) || undefined }
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Select Options */}
        {field.type === 'select' && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Opções de Seleção</Label>
              {field.options?.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])];
                      newOptions[i] = { ...opt, label: e.target.value };
                      onUpdateField({ options: newOptions });
                    }}
                    placeholder="Label"
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const newOptions = field.options?.filter((_, idx) => idx !== i);
                      onUpdateField({ options: newOptions });
                    }}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const newOptions = [...(field.options || []), { label: `Opção ${(field.options?.length || 0) + 1}`, value: `option-${Date.now()}` }];
                  onUpdateField({ options: newOptions });
                }}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Opção
              </Button>
            </div>
          </>
        )}

        {/* File Upload Settings */}
        {field.type === 'file' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Tipos de Arquivo</Label>
                <Input
                  value={field.acceptedFiles || ''}
                  onChange={(e) => onUpdateField({ acceptedFiles: e.target.value })}
                  placeholder=".pdf,.doc,.docx,.jpg,.png"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separe por vírgula. Ex: .pdf,.doc,.jpg
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Tamanho Máximo (MB)</Label>
                <Input
                  type="number"
                  value={field.maxFileSize || 5}
                  onChange={(e) => onUpdateField({ maxFileSize: parseInt(e.target.value) || 5 })}
                  min="1"
                  max="100"
                  className="mt-1.5"
                />
              </div>
            </div>
          </>
        )}

        {/* OCR Configuration */}
        {field.type === 'file' && (
          <OCRConfigPanel
            field={field}
            allFields={allFields}
            onUpdateField={(id, updates) => onUpdateField(updates)}
            allWorkflowFields={allWorkflowFields}
          />
        )}

        {/* API Field Configuration */}
        {isAPIField && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Validação API</h3>
              
              <div className="flex items-center justify-between">
                <Label className="text-sm">Validar ao sair do campo</Label>
                <Switch
                  checked={field.apiConfig?.validateOnBlur || false}
                  onCheckedChange={(checked) =>
                    onUpdateField({
                      apiConfig: { ...field.apiConfig, validateOnBlur: checked }
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Auto-preencher campos</Label>
                <Switch
                  checked={field.apiConfig?.enableAutoFill || false}
                  onCheckedChange={(checked) =>
                    onUpdateField({
                      apiConfig: { ...field.apiConfig, enableAutoFill: checked }
                    })
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
