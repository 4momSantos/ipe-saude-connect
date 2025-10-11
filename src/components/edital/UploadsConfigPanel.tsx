import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DOCUMENTOS_OBRIGATORIOS, getDefaultFieldsForDocumentType, mapTipoToOCRType } from '@/lib/inscricao-validation';

interface UploadsConfigPanelProps {
  form: UseFormReturn<any>;
}

export function UploadsConfigPanel({ form }: UploadsConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, any>>({});

  useEffect(() => {
    const uploadsConfig = form.watch('uploads_config') || {};
    
    // Inicializar config com valores padrão
    const initialConfig: Record<string, any> = {};
    DOCUMENTOS_OBRIGATORIOS.forEach(doc => {
      initialConfig[doc.tipo] = uploadsConfig[doc.tipo] || {
        obrigatorio: doc.obrigatorio ?? false,
        habilitado: true,
        label: doc.label
      };
    });
    
    setConfig(initialConfig);
  }, []);

  const handleToggle = (tipo: string, field: 'obrigatorio' | 'habilitado') => {
    const newConfig = {
      ...config,
      [tipo]: {
        ...config[tipo],
        [field]: !config[tipo][field]
      }
    };
    setConfig(newConfig);
    form.setValue('uploads_config', newConfig);
  };

  const handleLabelChange = (tipo: string, newLabel: string) => {
    const newConfig = {
      ...config,
      [tipo]: {
        ...config[tipo],
        label: newLabel
      }
    };
    setConfig(newConfig);
    form.setValue('uploads_config', newConfig);
  };

  const toggleOCR = (tipo: string) => {
    const newConfig = {
      ...config,
      [tipo]: {
        ...config[tipo],
        ocrConfig: {
          ...config[tipo]?.ocrConfig,
          enabled: !config[tipo]?.ocrConfig?.enabled,
          minConfidence: config[tipo]?.ocrConfig?.minConfidence || 70,
          autoValidate: config[tipo]?.ocrConfig?.autoValidate ?? true,
          documentType: mapTipoToOCRType(tipo),
          expectedFields: getDefaultFieldsForDocumentType(mapTipoToOCRType(tipo))
        }
      }
    };
    setConfig(newConfig);
    form.setValue('uploads_config', newConfig);
  };

  const updateOCRConfig = (tipo: string, key: string, value: any) => {
    const newConfig = {
      ...config,
      [tipo]: {
        ...config[tipo],
        ocrConfig: {
          ...config[tipo]?.ocrConfig,
          [key]: value
        }
      }
    };
    setConfig(newConfig);
    form.setValue('uploads_config', newConfig);
  };

  const toggleAutoValidate = (tipo: string) => {
    updateOCRConfig(tipo, 'autoValidate', !config[tipo]?.ocrConfig?.autoValidate);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📎 Configuração de Uploads</CardTitle>
        <CardDescription>
          Defina quais documentos serão obrigatórios/opcionais para este edital
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {DOCUMENTOS_OBRIGATORIOS.map(doc => (
          <div key={doc.tipo} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label className="font-medium">{doc.label}</Label>
                {config[doc.tipo]?.obrigatorio && (
                  <Badge variant="destructive" className="text-xs">Obrigatório</Badge>
                )}
                {config[doc.tipo]?.habilitado === false && (
                  <Badge variant="outline" className="text-xs">Desabilitado</Badge>
                )}
              </div>
              <Input
                placeholder="Label customizado"
                value={config[doc.tipo]?.label || doc.label}
                onChange={(e) => handleLabelChange(doc.tipo, e.target.value)}
                className="text-xs h-8 mt-1"
              />
            </div>
            <div className="flex items-center gap-4 ml-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={config[doc.tipo]?.habilitado ?? true}
                  onCheckedChange={() => handleToggle(doc.tipo, 'habilitado')}
                />
                <Label className="text-xs">Habilitado</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config[doc.tipo]?.obrigatorio ?? false}
                  onCheckedChange={() => handleToggle(doc.tipo, 'obrigatorio')}
                  disabled={!config[doc.tipo]?.habilitado}
                />
                <Label className="text-xs">Obrigatório</Label>
              </div>
            </div>

            {/* Configuração de OCR */}
            {config[doc.tipo]?.habilitado && (
              <div className="space-y-2 mt-2 p-3 bg-muted/50 rounded border border-dashed">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">🔍 Processar OCR</Label>
                  <Switch
                    checked={config[doc.tipo]?.ocrConfig?.enabled ?? false}
                    onCheckedChange={() => toggleOCR(doc.tipo)}
                  />
                </div>

                {config[doc.tipo]?.ocrConfig?.enabled && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label className="text-xs">Confiança Mínima (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={config[doc.tipo]?.ocrConfig?.minConfidence || 70}
                        onChange={(e) => updateOCRConfig(doc.tipo, 'minConfidence', parseInt(e.target.value))}
                        className="h-8 mt-1"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={config[doc.tipo]?.ocrConfig?.autoValidate ?? true}
                        onCheckedChange={() => toggleAutoValidate(doc.tipo)}
                      />
                      <Label className="text-xs">Validação Automática</Label>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Campos Esperados:</Label>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        {getDefaultFieldsForDocumentType(mapTipoToOCRType(doc.tipo))
                          .map(f => f.ocrField)
                          .join(', ') || 'Nenhum'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
