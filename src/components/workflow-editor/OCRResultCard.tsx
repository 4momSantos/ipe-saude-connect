import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  FileCheck, 
  X,
  AlertTriangle,
  Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OCRValidationResult } from "@/lib/ocr-processor";
import { FormField } from "@/types/workflow-editor";

interface OCRResultCardProps {
  ocrResult: OCRValidationResult;
  field: FormField;
  uploadedFile: File;
  onAccept: () => void;
  onReject: () => void;
  onReupload: () => void;
}

export function OCRResultCard({
  ocrResult,
  field,
  uploadedFile,
  onAccept,
  onReject,
  onReupload
}: OCRResultCardProps) {
  
  // Determinar status geral e cor da borda
  const getOverallStatus = () => {
    if (ocrResult.errors.length > 0) return 'error';
    if (ocrResult.warnings.length > 0) return 'warning';
    if (ocrResult.success) return 'success';
    return 'pending';
  };

  const overallStatus = getOverallStatus();

  const borderColors = {
    success: 'border-green-500',
    warning: 'border-yellow-500',
    error: 'border-red-500',
    pending: 'border-gray-300'
  };

  const statusIcons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    pending: <AlertCircle className="h-5 w-5 text-gray-400" />
  };

  const statusLabels = {
    success: 'Processamento Concluído',
    warning: 'Processado com Avisos',
    error: 'Erro no Processamento',
    pending: 'Processando...'
  };

  // Campos faltantes obrigatórios
  const missingRequiredFields = ocrResult.missingRequiredFields || [];

  return (
    <Card className={cn("p-4 space-y-4 border-2 transition-colors", borderColors[overallStatus])}>
      {/* Cabeçalho com arquivo e status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <FileCheck className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{uploadedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReject}
          className="flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Status Geral */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          {statusIcons[overallStatus]}
          <span className="text-sm font-medium">{statusLabels[overallStatus]}</span>
        </div>
        <Badge variant={overallStatus === 'success' ? 'default' : 'secondary'}>
          {ocrResult.overallConfidence}% confiança
        </Badge>
      </div>

      {/* Barra de Confiança */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confiança OCR</span>
          <span className="font-medium">{ocrResult.overallConfidence}%</span>
        </div>
        <Progress 
          value={ocrResult.overallConfidence} 
          className={cn(
            "h-2",
            ocrResult.overallConfidence >= 80 && "[&>div]:bg-green-500",
            ocrResult.overallConfidence >= 50 && ocrResult.overallConfidence < 80 && "[&>div]:bg-yellow-500",
            ocrResult.overallConfidence < 50 && "[&>div]:bg-red-500"
          )}
        />
      </div>

      {/* Campos Extraídos */}
      {field.ocrConfig?.expectedFields && field.ocrConfig.expectedFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Campos Esperados:</p>
          <div className="space-y-2">
            {field.ocrConfig.expectedFields.map((expectedField, idx) => {
              const validation = ocrResult.validations.find(v => v.field === expectedField.ocrField);
              const extractedValue = ocrResult.extractedData[expectedField.ocrField];
              
              let statusIcon;
              let statusColor;
              let statusLabel;

              if (!extractedValue) {
                if (expectedField.required) {
                  statusIcon = <XCircle className="h-4 w-4 text-red-500" />;
                  statusColor = "text-red-500";
                  statusLabel = "Não encontrado (obrigatório)";
                } else {
                  statusIcon = <AlertCircle className="h-4 w-4 text-gray-400" />;
                  statusColor = "text-gray-500";
                  statusLabel = "Não encontrado";
                }
              } else if (validation?.status === 'valid') {
                statusIcon = <CheckCircle2 className="h-4 w-4 text-green-500" />;
                statusColor = "text-green-600";
                statusLabel = "Validado";
              } else if (validation?.status === 'warning') {
                statusIcon = <AlertTriangle className="h-4 w-4 text-yellow-500" />;
                statusColor = "text-yellow-600";
                statusLabel = "Divergência";
              } else if (validation?.status === 'invalid') {
                statusIcon = <XCircle className="h-4 w-4 text-red-500" />;
                statusColor = "text-red-500";
                statusLabel = "Inválido";
              } else {
                statusIcon = <AlertCircle className="h-4 w-4 text-blue-400" />;
                statusColor = "text-blue-500";
                statusLabel = "Extraído";
              }

              return (
                <div key={idx} className="flex items-start gap-2 p-2 bg-background rounded border">
                  {statusIcon}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{expectedField.ocrField}</span>
                      {expectedField.required && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200">
                          obrigatório
                        </Badge>
                      )}
                    </div>
                    {extractedValue ? (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Valor: <span className="font-mono">{String(extractedValue)}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {statusLabel}
                      </p>
                    )}
                    {validation?.message && (
                      <p className={cn("text-xs mt-1", statusColor)}>
                        {validation.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Campos Faltantes (Obrigatórios) */}
      {missingRequiredFields.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold text-sm mb-1">Campos obrigatórios não encontrados:</p>
            <ul className="list-disc pl-4 space-y-1">
              {missingRequiredFields.map((fieldName, idx) => (
                <li key={idx} className="text-xs">{fieldName}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Avisos */}
      {ocrResult.warnings.length > 0 && missingRequiredFields.length === 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              {ocrResult.warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Erros (além dos campos faltantes) */}
      {ocrResult.errors.length > 0 && ocrResult.errors.some(e => !e.includes('não encontrado no documento')) && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              {ocrResult.errors
                .filter(e => !e.includes('não encontrado no documento'))
                .map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onAccept}
          disabled={!ocrResult.success || missingRequiredFields.length > 0}
          className="flex-1"
        >
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Aceitar Dados
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReupload}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-1" />
          Reenviar
        </Button>
      </div>
    </Card>
  );
}
