import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FileText, Upload, AlertCircle, Sparkles, CheckCircle2, XCircle, RotateCcw, RotateCw, FlipVertical } from 'lucide-react';
import { toast } from 'sonner';
import { processOCRWithValidation, getDocumentTypes, getDefaultFieldsForDocumentType } from '@/lib/ocr-processor';
import type { OCRValidationResult } from '@/lib/ocr-processor';
import { OCRResultCard } from '@/components/workflow-editor/OCRResultCard';

export default function TesteOCR() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('rg');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRValidationResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const documentTypes = getDocumentTypes();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setOcrResult(null);
      setRotation(0);
      
      // Criar preview se for imagem
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const rotateImage = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
    toast.info(`Imagem rotacionada ${degrees > 0 ? 'direita' : 'esquerda'} (${(rotation + degrees) % 360}°)`);
  };

  const getRotatedFile = async (): Promise<File> => {
    if (!selectedFile || rotation === 0) {
      return selectedFile!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        // Ajustar tamanho do canvas baseado na rotação
        const radians = (rotation * Math.PI) / 180;
        const sin = Math.abs(Math.sin(radians));
        const cos = Math.abs(Math.cos(radians));
        canvas.width = img.width * cos + img.height * sin;
        canvas.height = img.width * sin + img.height * cos;

        // Rotacionar e desenhar
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(radians);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Converter para blob e criar novo File
        canvas.toBlob((blob) => {
          if (blob) {
            const rotatedFile = new File([blob], selectedFile.name, {
              type: selectedFile.type,
            });
            resolve(rotatedFile);
          } else {
            reject(new Error('Falha ao criar blob da imagem rotacionada'));
          }
        }, selectedFile.type);
      };
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.src = previewUrl!;
    });
  };

  const handleProcessOCR = async () => {
    if (!selectedFile) {
      toast.error('Selecione um arquivo primeiro');
      return;
    }

    setIsProcessing(true);
    setOcrResult(null);

    try {
      if (rotation !== 0) {
        toast.info(`🔄 Aplicando rotação de ${rotation}° antes do OCR...`);
      } else {
        toast.info('🔍 Processando OCR com rotação automática inteligente...');
      }

      // Buscar campos padrão para o tipo de documento
      const defaultFields = getDefaultFieldsForDocumentType(documentType as any);

      const ocrConfig = {
        documentType: documentType as any,
        expectedFields: defaultFields,
        enabled: true,
        minConfidence: 70,
        autoValidate: true,
      };

      // Obter arquivo rotacionado se necessário
      const fileToProcess = await getRotatedFile();

      const result = await processOCRWithValidation(
        fileToProcess,
        ocrConfig,
        {}, // formData vazio para teste
        []
      );

      setOcrResult(result);

      if (result.success) {
        toast.success(`✅ OCR processado: ${result.overallConfidence}% confiança`);
      } else if (result.warnings.length > 0) {
        toast.warning(`⚠️ OCR processado com ${result.warnings.length} aviso(s)`);
      } else {
        toast.error('❌ Erro no processamento OCR');
      }
    } catch (error) {
      console.error('Erro ao processar OCR:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar OCR');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setOcrResult(null);
    setPreviewUrl(null);
    setRotation(0);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Teste de OCR</h1>
            <p className="text-muted-foreground">
              Teste o processamento OCR de documentos em tempo real
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Painel de Configuração */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Configuração e Upload
            </CardTitle>
            <CardDescription>
              Selecione o tipo de documento e faça upload para teste
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seletor de Tipo de Documento */}
            <div className="space-y-2">
              <Label htmlFor="document-type">Tipo de Documento</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="document-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Selecione o tipo de documento que você deseja processar
              </p>
            </div>

            {/* Upload de Arquivo */}
            <div className="space-y-2">
              <Label htmlFor="file-upload">Arquivo</Label>
              <div className="space-y-3">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  Formatos aceitos: PDF, JPG, PNG (máx. 10MB)
                </p>
              </div>
            </div>

            {/* Preview da Imagem */}
            {previewUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Preview do Documento</Label>
                  <Badge variant="outline" className="text-xs">
                    Rotação: {rotation}°
                  </Badge>
                </div>
                <div className="border rounded-lg overflow-hidden bg-muted/50">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transition: 'transform 0.3s ease',
                    }}
                    className="w-full h-auto max-h-64 object-contain"
                  />
                </div>
                
                {/* Botões de Rotação Manual */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rotateImage(-90)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    90° Esquerda
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rotateImage(180)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <FlipVertical className="h-4 w-4 mr-2" />
                    180°
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rotateImage(90)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <RotateCw className="h-4 w-4 mr-2" />
                    90° Direita
                  </Button>
                </div>
                
                <Alert className="bg-blue-500/5 border-blue-500/20">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-xs">
                    <strong>💡 Rotação Híbrida:</strong> Você pode rotacionar manualmente, mas se não o fizer, 
                    o sistema tentará automaticamente múltiplas orientações para encontrar a melhor.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Info do Arquivo */}
            {selectedFile && (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Tamanho: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tipo: {selectedFile.type || 'Desconhecido'}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Button
                onClick={handleProcessOCR}
                disabled={!selectedFile || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Processar OCR
                  </>
                )}
              </Button>
              {(selectedFile || ocrResult) && (
                <Button variant="outline" onClick={handleReset}>
                  Limpar
                </Button>
              )}
            </div>

            {/* Info sobre Campos Esperados */}
            {documentType && (
              <Alert className="bg-primary/5 border-primary/20">
                <AlertCircle className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <p className="text-sm font-medium mb-2">Campos esperados para {documentTypes.find(t => t.value === documentType)?.label}:</p>
                  <div className="flex flex-wrap gap-1">
                    {getDefaultFieldsForDocumentType(documentType as any).map((field, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {field.ocrField}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Badge>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Painel de Resultados */}
        <div className="space-y-6">
          {!ocrResult && !isProcessing && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Selecione um arquivo e clique em "Processar OCR" para ver os resultados
                </p>
              </CardContent>
            </Card>
          )}

          {isProcessing && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
                <p className="text-sm font-medium">Processando OCR...</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Isso pode levar alguns segundos
                </p>
              </CardContent>
            </Card>
          )}

          {ocrResult && selectedFile && (
            <div className="space-y-4">
              <OCRResultCard
                ocrResult={ocrResult}
                field={{
                  id: 'test',
                  label: documentTypes.find(t => t.value === documentType)?.label || documentType,
                  type: 'file',
                  size: 'full',
                  validation: {
                    required: false
                  },
                  ocrConfig: {
                    documentType: documentType as any,
                    expectedFields: getDefaultFieldsForDocumentType(documentType as any),
                    enabled: true,
                    minConfidence: 70,
                    autoValidate: true,
                  }
                }}
                uploadedFile={selectedFile}
                onAccept={() => {
                  toast.success('✅ Dados aceitos! (modo teste)');
                }}
                onReject={() => {
                  toast.info('❌ Dados rejeitados. Faça novo upload.');
                  handleReset();
                }}
                onReupload={() => {
                  toast.info('🔄 Faça novo upload do arquivo.');
                  setSelectedFile(null);
                  setOcrResult(null);
                }}
              />

              {/* Dados Brutos Extraídos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Dados Extraídos (Raw JSON)</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(ocrResult.extractedData, null, 2)}
                  </pre>
                </CardContent>
              </Card>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status Geral</span>
                      {ocrResult.success ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {ocrResult.success ? 'Sucesso' : 'Falha'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Confiança</span>
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {ocrResult.overallConfidence}%
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Campos Extraídos</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {Object.keys(ocrResult.extractedData).length}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Completude</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {ocrResult.completenessScore}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documentação */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm">💡 Como usar esta página de testes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Selecione o tipo de documento que deseja testar (RG, CNH, CPF, etc.)</li>
            <li>Faça upload de uma imagem ou PDF do documento</li>
            <li>Clique em "Processar OCR" e aguarde o resultado</li>
            <li>Analise os campos extraídos, confiança e validações</li>
            <li>Use os botões "Aceitar", "Rejeitar" ou "Reenviar" para testar o fluxo</li>
          </ol>
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Nota:</strong> Esta é uma página de testes. Os dados não serão salvos no banco de dados.
              Para processamento real, use o fluxo de inscrição normal.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
