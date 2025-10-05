import { useState } from "react";
import { FormField } from "@/types/workflow-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Upload, CalendarIcon, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  validateCPFData, 
  validateCNPJData, 
  validateCRM, 
  validateNIT, 
  validateCEP,
  formatCPF,
  formatCNPJ,
  formatCEP,
  formatPhone
} from "@/lib/validators";
import { processOCRWithValidation, OCRValidationResult } from "@/lib/ocr-processor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldLabel } from "./FieldLabel";
import { OCRResultCard } from "./OCRResultCard";

interface FieldPreviewProps {
  field: FormField;
  value?: any;
  onChange?: (value: any) => void;
  onValidationComplete?: (isValid: boolean, data?: any) => void;
}

export function FieldPreview({ field, value, onChange, onValidationComplete }: FieldPreviewProps) {
  const [date, setDate] = useState<Date>();
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  
  // OCR states
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRValidationResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const baseClasses = "w-full transition-all duration-200";

  const handleAPIValidation = async (inputValue: string) => {
    if (!field.apiConfig?.enableValidation || !inputValue) return;

    setIsValidating(true);
    setValidationStatus('idle');

    try {
      let result;
      switch (field.type) {
        case 'cpf':
          result = await validateCPFData(inputValue, ''); // Birthdate can be added later
          break;
        case 'cnpj':
          result = await validateCNPJData(inputValue);
          break;
        case 'crm':
          // Assuming CRM format is "123456-UF"
          const [crm, uf] = inputValue.split('-');
          result = await validateCRM(crm, uf);
          break;
        case 'nit':
          // NIT validation requires CPF, name, and birthdate
          // This is simplified - in real scenario, get from other fields
          result = { valid: true }; // Placeholder
          break;
        case 'cep':
          result = await validateCEP(inputValue);
          break;
      }

      if (result?.valid) {
        setValidationStatus('valid');
        onValidationComplete?.(true, result.data);
      } else {
        setValidationStatus('invalid');
        onValidationComplete?.(false);
      }
    } catch (error) {
      setValidationStatus('invalid');
      onValidationComplete?.(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    onChange?.(newValue);
    
    // Format input based on type
    let formatted = newValue;
    switch (field.type) {
      case 'cpf':
        formatted = formatCPF(newValue);
        break;
      case 'cnpj':
        formatted = formatCNPJ(newValue);
        break;
      case 'cep':
        formatted = formatCEP(newValue);
        break;
      case 'phone':
        formatted = formatPhone(newValue);
        break;
    }
    
    if (formatted !== newValue) {
      onChange?.(formatted);
    }
  };

  const handleBlur = () => {
    if (field.apiConfig?.validateOnBlur && value) {
      handleAPIValidation(value);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      onChange?.(file);

      // Se OCR está habilitado, processar automaticamente
      if (field.ocrConfig?.enabled) {
        await processOCR(file);
      }
    }
  };

  const processOCR = async (file: File) => {
    if (!field.ocrConfig?.enabled) return;

    setOcrProcessing(true);
    setOcrResult(null);

    try {
      // Obter dados do formulário (simular - em produção virá do contexto)
      const formData = {}; // TODO: pegar do contexto do formulário
      const allFormFields: any[] = []; // TODO: pegar todos os campos do formulário

      const result = await processOCRWithValidation(
        file,
        field.ocrConfig,
        formData,
        allFormFields
      );

      setOcrResult(result);

      // Notificar validação
      if (onValidationComplete) {
        onValidationComplete(result.success, result.extractedData);
      }
    } catch (error) {
      console.error('Erro ao processar OCR:', error);
      setOcrResult({
        success: false,
        extractedData: {},
        validations: [],
        overallConfidence: 0,
        errors: ['Erro ao processar documento'],
        warnings: [],
        overallStatus: 'error',
        missingRequiredFields: [],
        completenessScore: 0
      });
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleAcceptOCR = () => {
    // Implementar lógica de aceitar OCR - preencher campos do formulário
    console.log('OCR aceito:', ocrResult);
    if (ocrResult && onValidationComplete) {
      onValidationComplete(true, ocrResult.extractedData);
    }
  };

  const handleRejectOCR = () => {
    setOcrResult(null);
    setUploadedFile(null);
    onChange?.(undefined);
  };

  const handleReupload = () => {
    setOcrResult(null);
    setUploadedFile(null);
    onChange?.(undefined);
    // Trigger file input click
    document.querySelector(`input[type="file"][accept="${field.acceptedFiles}"]`)?.dispatchEvent(new MouseEvent('click'));
  };

  const renderValidationIcon = () => {
    if (!field.apiConfig?.enableValidation) return null;
    
    if (isValidating) {
      return <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />;
    }
    
    if (validationStatus === 'valid') {
      return <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />;
    }
    
    if (validationStatus === 'invalid') {
      return <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />;
    }
    
    return null;
  };

  switch (field.type) {
    case 'textarea':
      return (
        <Textarea 
          className={cn(baseClasses, "resize-none min-h-[100px]")} 
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          rows={4}
        />
      );
      
    case 'select':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className={baseClasses}>
            <SelectValue placeholder={field.placeholder || "Selecione uma opção"} />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((opt, i) => (
              <SelectItem key={i} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      
    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={value || false}
            onCheckedChange={onChange}
          />
          <span className="text-sm text-foreground">{field.label}</span>
        </div>
      );
      
    case 'date':
      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                baseClasses,
                "justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "dd/MM/yyyy") : <span>{field.placeholder || "Selecione uma data"}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => {
                setDate(newDate);
                onChange?.(newDate);
              }}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      );
      
    case 'file':
      return (
        <div className="space-y-3">
          {/* Campo Label com Badge Obrigatório */}
          <FieldLabel label={field.label} required={field.validation?.required} />

          {/* Upload Input */}
          {!uploadedFile && (
            <label className="block border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-muted/20">
              <input
                type="file"
                onChange={handleFileChange}
                accept={field.acceptedFiles}
                className="hidden"
              />
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-foreground mb-1">
                Clique para fazer upload ou arraste o arquivo
              </p>
              <p className="text-xs text-muted-foreground">
                {field.acceptedFiles || 'Todos os tipos'} • Máximo {field.maxFileSize || 5}MB
              </p>
              {field.ocrConfig?.enabled && (
                <p className="text-xs text-primary mt-2 font-medium">
                  🔍 OCR habilitado - Documento será processado automaticamente
                </p>
              )}
            </label>
          )}

          {/* OCR Processing Indicator */}
          {ocrProcessing && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Processando documento com OCR...
              </AlertDescription>
            </Alert>
          )}

          {/* OCR Result Card */}
          {uploadedFile && !ocrProcessing && ocrResult && field.ocrConfig?.enabled && (
            <OCRResultCard
              ocrResult={ocrResult}
              field={field}
              uploadedFile={uploadedFile}
              onAccept={handleAcceptOCR}
              onReject={handleRejectOCR}
              onReupload={handleReupload}
            />
          )}

          {/* Fallback: arquivo sem OCR */}
          {uploadedFile && !ocrProcessing && !field.ocrConfig?.enabled && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <p className="text-sm font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      );
      
    case 'cpf':
    case 'cnpj':
    case 'crm':
    case 'nit':
    case 'cep':
    case 'rg':
    case 'phone':
      return (
        <div className="relative">
          <Input 
            type="text"
            className={cn(
              baseClasses,
              field.apiConfig?.enableValidation && "pr-10",
              validationStatus === 'valid' && "border-green-500 focus-visible:ring-green-500",
              validationStatus === 'invalid' && "border-destructive focus-visible:ring-destructive"
            )}
            placeholder={field.placeholder}
            value={value || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleBlur}
          />
          {renderValidationIcon()}
        </div>
      );
      
    default:
      return (
        <Input 
          type={field.type}
          className={baseClasses}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
        />
      );
  }
}
