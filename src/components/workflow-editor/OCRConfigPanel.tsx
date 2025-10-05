import { FormField, OCRFieldMapping } from '@/types/workflow-editor';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Trash2, Plus, FileCheck } from 'lucide-react';
import { getDocumentTypes, getValidationAPIs, getDefaultFieldsForDocumentType } from '@/lib/ocr-processor';

interface OCRConfigPanelProps {
  field: FormField;
  allFields: FormField[];
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  allWorkflowFields?: Array<FormField & { nodeName?: string }>;
}

export const OCRConfigPanel = ({ field, allFields, onUpdateField, allWorkflowFields = [] }: OCRConfigPanelProps) => {
  const ocrConfig = field.ocrConfig || {
    enabled: false,
    documentType: 'rg' as const,
    expectedFields: [],
    minConfidence: 70,
    autoValidate: true
  };

  // Combinar campos do formulário atual + todos os campos do workflow
  const allAvailableFields = [
    ...allFields.filter(f => f.id !== field.id && f.type !== 'file'),
    ...allWorkflowFields.filter(f => f.id !== field.id && f.type !== 'file')
  ];

  const handleToggleOCR = (enabled: boolean) => {
    if (enabled && ocrConfig.expectedFields.length === 0) {
      // Carregar campos padrão para o tipo de documento
      const defaultFields = getDefaultFieldsForDocumentType(ocrConfig.documentType);
      onUpdateField(field.id, {
        ocrConfig: { ...ocrConfig, enabled, expectedFields: defaultFields }
      });
    } else {
      onUpdateField(field.id, {
        ocrConfig: { ...ocrConfig, enabled }
      });
    }
  };

  const handleDocumentTypeChange = (documentType: string) => {
    const defaultFields = getDefaultFieldsForDocumentType(documentType);
    onUpdateField(field.id, {
      ocrConfig: {
        ...ocrConfig,
        documentType: documentType as any,
        expectedFields: defaultFields
      }
    });
  };

  const handleAddField = () => {
    const newField: OCRFieldMapping = {
      ocrField: '',
      required: false
    };
    onUpdateField(field.id, {
      ocrConfig: {
        ...ocrConfig,
        expectedFields: [...ocrConfig.expectedFields, newField]
      }
    });
  };

  const handleRemoveField = (index: number) => {
    const newFields = ocrConfig.expectedFields.filter((_, i) => i !== index);
    onUpdateField(field.id, {
      ocrConfig: { ...ocrConfig, expectedFields: newFields }
    });
  };

  const handleUpdateFieldMapping = (index: number, updates: Partial<OCRFieldMapping>) => {
    const newFields = [...ocrConfig.expectedFields];
    newFields[index] = { ...newFields[index], ...updates };
    onUpdateField(field.id, {
      ocrConfig: { ...ocrConfig, expectedFields: newFields }
    });
  };

  // Debug: verificar campos disponíveis
  console.log('🔍 OCRConfigPanel - Debug:', {
    currentFormFields: allFields.length,
    workflowFields: allWorkflowFields.length,
    totalAvailable: allAvailableFields.length,
    fieldDetails: allAvailableFields.map(f => ({ 
      id: f.id, 
      label: f.label, 
      type: f.type,
      source: 'nodeName' in f ? f.nodeName : 'Formulário Atual'
    }))
  });

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center gap-2">
        <FileCheck className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Configuração OCR</h3>
      </div>

      {/* Info Alert */}
      <div className="text-xs p-3 bg-muted/50 rounded-lg border border-border">
        <p className="font-medium mb-1">ℹ️ Como funciona o mapeamento:</p>
        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
          <li><strong>Campos OCR:</strong> dados que serão extraídos do documento</li>
          <li><strong>Comparar com formulário:</strong> valida se corresponde ao preenchido</li>
          <li><strong>Campos disponíveis:</strong> 
            {allFields.length - 1} do formulário atual + {allWorkflowFields.length} de outras etapas
            = <strong>{allAvailableFields.length} total</strong>
          </li>
        </ul>
      </div>

      {/* Habilitar OCR */}
      <div className="flex items-center justify-between">
        <Label htmlFor="enable-ocr">Habilitar OCR</Label>
        <Switch
          id="enable-ocr"
          checked={ocrConfig.enabled}
          onCheckedChange={handleToggleOCR}
        />
      </div>

      {ocrConfig.enabled && (
        <>
          {/* Tipo de Documento */}
          <div className="space-y-2">
            <Label>Tipo de Documento</Label>
            <Select
              value={ocrConfig.documentType}
              onValueChange={handleDocumentTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getDocumentTypes().map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campos Esperados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Campos Esperados</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddField}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Campo
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {ocrConfig.expectedFields.map((fieldMapping, index) => (
                <Card key={index} className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Campo {index + 1}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveField(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Nome do campo OCR */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Nome do campo no documento</Label>
                      <Input
                        value={fieldMapping.ocrField}
                        onChange={(e) => handleUpdateFieldMapping(index, { ocrField: e.target.value })}
                        placeholder="Ex: cpf, nome, data_nascimento"
                        className="text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fieldMapping.required}
                          onChange={(e) => 
                            handleUpdateFieldMapping(index, { required: e.target.checked })
                          }
                          className="rounded"
                        />
                        <span className="text-xs font-medium">Obrigatório</span>
                      </label>
                    </div>
                  </div>

                  {/* Comparar com campo do formulário */}
                  <div>
                    <Label className="text-xs">Comparar com campo do formulário</Label>
                    {allAvailableFields.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-2 border border-dashed rounded">
                        Nenhum campo disponível. Adicione campos aos formulários do workflow.
                      </div>
                    ) : (
                      <Select
                        value={fieldMapping.formFieldId || undefined}
                        onValueChange={(value) => 
                          handleUpdateFieldMapping(index, { formFieldId: value || undefined })
                        }
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Selecione um campo" />
                        </SelectTrigger>
                        <SelectContent>
                          {allAvailableFields.map(f => {
                            const source = 'nodeName' in f && f.nodeName ? ` [${f.nodeName}]` : '';
                            return (
                              <SelectItem key={f.id} value={f.id}>
                                {f.label} ({f.type}){source}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* API de validação */}
                  <div>
                    <Label className="text-xs">API de Validação</Label>
                    <Select
                      value={fieldMapping.validateAPI || undefined}
                      onValueChange={(value) => 
                        handleUpdateFieldMapping(index, { validateAPI: value || undefined })
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Nenhuma validação" />
                      </SelectTrigger>
                      <SelectContent>
                        {getValidationAPIs().map(api => (
                          <SelectItem key={api.value} value={api.value}>
                            {api.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Obrigatório */}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Obrigatório</Label>
                    <Switch
                      checked={fieldMapping.required}
                      onCheckedChange={(checked) => 
                        handleUpdateFieldMapping(index, { required: checked })
                      }
                    />
                  </div>

                  {/* Mensagem de erro customizada */}
                  {fieldMapping.required && (
                    <div>
                      <Label className="text-xs">Mensagem de Erro (opcional)</Label>
                      <Input
                        value={fieldMapping.errorMessage || ''}
                        onChange={(e) => 
                          handleUpdateFieldMapping(index, { errorMessage: e.target.value })
                        }
                        placeholder="Mensagem customizada"
                        className="text-sm"
                      />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Confiança Mínima */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Confiança Mínima</Label>
              <span className="text-sm text-muted-foreground">{ocrConfig.minConfidence}%</span>
            </div>
            <Slider
              value={[ocrConfig.minConfidence]}
              onValueChange={([value]) => 
                onUpdateField(field.id, {
                  ocrConfig: { ...ocrConfig, minConfidence: value }
                })
              }
              min={0}
              max={100}
              step={5}
            />
          </div>

          {/* Validação Automática */}
          <div className="flex items-center justify-between">
            <Label htmlFor="auto-validate">Validação Automática</Label>
            <Switch
              id="auto-validate"
              checked={ocrConfig.autoValidate}
              onCheckedChange={(checked) => 
                onUpdateField(field.id, {
                  ocrConfig: { ...ocrConfig, autoValidate: checked }
                })
              }
            />
          </div>
        </>
      )}
    </div>
  );
};
