import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { InscricaoCompletaForm, DOCUMENTOS_OBRIGATORIOS, getDocumentosByTipo } from '@/lib/inscricao-schema-unificado';
import { useUploadsConfig } from '@/hooks/useUploadsConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Eye,
  Trash2
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useInscricaoDocumentos } from '@/hooks/useInscricaoDocumentos';
import { processOCRWithValidation } from '@/lib/ocr-processor';
import { toast } from 'sonner';
import { OCRResultCard } from '@/components/workflow-editor/OCRResultCard';
import type { OCRValidationResult } from '@/lib/ocr-processor';

interface DocumentosStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
  inscricaoId?: string;
  editalId?: string; // FASE 3: Adicionar editalId para buscar config dinâmica
}

const statusIcons = {
  pendente: AlertTriangle,
  validado: CheckCircle2,
  rejeitado: XCircle,
  faltante: Upload,
  enviado: FileText,
};

const statusColors = {
  pendente: 'text-[hsl(var(--orange-warning))]',
  validado: 'text-[hsl(var(--green-approved))]',
  rejeitado: 'text-[hsl(var(--red-rejected))]',
  faltante: 'text-muted-foreground',
  enviado: 'text-blue-500',
};

const statusLabels = {
  pendente: 'Em análise',
  validado: 'Validado',
  rejeitado: 'Rejeitado',
  faltante: 'Não enviado',
  enviado: 'Enviado',
};

export function DocumentosStep({ form, inscricaoId, editalId }: DocumentosStepProps) {
  const { fields, update } = useFieldArray({
    control: form.control,
    name: 'documentos',
  });

  // FASE 3: Buscar configuração dinâmica de uploads
  const { data: uploadsConfig, isLoading: isLoadingConfig } = useUploadsConfig(editalId);

  const { salvarDocumento } = useInscricaoDocumentos(inscricaoId);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [ocrResults, setOcrResults] = useState<Record<number, OCRValidationResult>>({});

  // Obter tipo de credenciamento do formulário
  const tipoCredenciamento = form.watch('tipo_credenciamento');
  
  // Usar documentos dinâmicos ou baseado no tipo (com useMemo para performance)
  const documentosParaExibir = useMemo(() => {
    // Prioridade 1: Config do edital (se existir)
    if (uploadsConfig) {
      console.log('[DocumentosStep] Usando config do edital:', uploadsConfig.length, 'documentos');
      return uploadsConfig;
    }
    
    // Prioridade 2: Filtrar por tipo de credenciamento
    if (!tipoCredenciamento) {
      console.warn('[DocumentosStep] ⚠️ Tipo de credenciamento não selecionado');
      return [];
    }
    
    const docs = getDocumentosByTipo(tipoCredenciamento);
    console.log(`[DocumentosStep] Documentos para ${tipoCredenciamento}:`, docs.map(d => d.tipo));
    return docs;
  }, [uploadsConfig, tipoCredenciamento]);

  const documentosObrigatorios = documentosParaExibir.filter(d => d.obrigatorio);

  if (isLoadingConfig) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        <span className="ml-2 text-muted-foreground">Carregando configuração de documentos...</span>
      </div>
    );
  }

  // Validar que tipo foi selecionado antes de exibir documentos
  if (!tipoCredenciamento && !uploadsConfig) {
    return (
      <Alert className="border-orange-500/50 bg-orange-500/10">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertDescription className="text-orange-700 dark:text-orange-300">
          Por favor, selecione o tipo de credenciamento (Pessoa Física ou Pessoa Jurídica) antes de enviar documentos.
        </AlertDescription>
      </Alert>
    );
  }

  // Não exibir nada se não há documentos configurados
  if (documentosParaExibir.length === 0) {
    return (
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <AlertTriangle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Nenhum documento configurado para upload. Entre em contato com o suporte.
        </AlertDescription>
      </Alert>
    );
  }

  const handleFileChange = async (index: number, file: File | null) => {
    if (!file) return;

    setUploadingIndex(index);

    try {
      toast.info('📤 Fazendo upload do arquivo...');
      
      // FASE 3: Buscar config OCR do documento dinâmico
      const doc = documentosParaExibir[index];
      const documentoConfig = doc.ocrConfig || {
        documentType: (fields[index].tipo || 'cpf') as any,
        expectedFields: [],
        enabled: false,
        minConfidence: 70,
        autoValidate: false,
      };

      let ocrResult: OCRValidationResult | undefined;

      // Processar OCR se habilitado
      if (documentoConfig.enabled) {
        console.log(`[DocumentosStep] 🔍 Processando OCR para ${doc.label}...`);
        console.log('[DocumentosStep] Config OCR:', JSON.stringify(documentoConfig, null, 2));
        toast.info('🔍 Processando OCR no documento...');
        
        try {
          ocrResult = await processOCRWithValidation(
            file,
            documentoConfig,
            form.getValues(),
            []
          );

          console.log('[DocumentosStep] ✅ Resultado OCR:', ocrResult);
          
          // Armazenar resultado do OCR
          setOcrResults(prev => ({ ...prev, [index]: ocrResult! }));

          if (ocrResult.success) {
            toast.success(`✅ OCR processado: ${ocrResult.overallConfidence}% confiança`);
          } else if (ocrResult.warnings.length > 0) {
            toast.warning(`⚠️ OCR processado com avisos`);
          } else {
            toast.error(`❌ Erro no OCR: verifique os campos obrigatórios`);
          }
        } catch (ocrError) {
          console.error('[DocumentosStep] ❌ Erro ao processar OCR:', ocrError);
          console.error('[DocumentosStep] Stack:', ocrError instanceof Error ? ocrError.stack : 'No stack');
          toast.error(`Erro ao processar OCR: ${ocrError instanceof Error ? ocrError.message : 'Erro desconhecido'}`);
          ocrResult = {
            success: false,
            extractedData: {},
            validations: [],
            overallConfidence: 0,
            overallStatus: 'error' as const,
            errors: [ocrError instanceof Error ? ocrError.message : 'Erro desconhecido'],
            warnings: [],
            missingRequiredFields: [],
            completenessScore: 0
          };
        }
      }

      // Atualizar estado local
      update(index, {
        ...fields[index],
        arquivo: file,
        status: ocrResult?.success ? 'validado' : 'enviado',
        ocrResult,
      });

      // Salvar no banco de dados se tiver inscricaoId
      if (inscricaoId) {
        console.log('[DocumentosStep] 💾 Salvando documento no banco...');
        await salvarDocumento.mutateAsync({
          inscricaoId,
          tipoDocumento: fields[index].tipo,
          arquivo: file,
          ocrResultado: ocrResult,
        });
      }

      toast.success(`✅ Arquivo "${file.name}" enviado com sucesso!`);
    } catch (error) {
      console.error('❌ Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo');
      
      // Atualizar com status de erro
      update(index, {
        ...fields[index],
        arquivo: file,
        status: 'pendente',
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveFile = (index: number) => {
    update(index, {
      ...fields[index],
      arquivo: undefined,
      status: 'faltante',
    });
  };

  // FASE 3: Calcular progresso baseado em documentos obrigatórios da config dinâmica
  const documentosEnviados = fields.filter(d => 
    (d.arquivo || d.url) && 
    documentosObrigatorios.some(doc => doc.tipo === d.tipo)
  ).length;
  const progress = Math.min((documentosEnviados / documentosObrigatorios.length) * 100, 100);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-semibold mb-2">Upload de Documentos</h3>
        <p className="text-sm text-muted-foreground">
          Anexe todos os documentos obrigatórios para análise
        </p>
      </div>

      {/* Progresso de upload */}
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Progresso do upload</span>
            <span className="text-sm">
              {documentosEnviados} de {documentosObrigatorios.length} documentos obrigatórios
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </AlertDescription>
      </Alert>

      {/* FASE 3: Lista de documentos dinâmica */}
      <div className="space-y-3">
        {documentosParaExibir.map((doc, index) => {
          // Garantir que fields[index] existe
          if (!fields[index]) {
            console.warn(`[DocumentosStep] Field ${index} não existe, criando...`);
            update(index, {
              tipo: doc.tipo,
              status: 'faltante',
            });
          }
          
          const documentoAtual = fields[index];
          const StatusIcon = statusIcons[documentoAtual?.status || 'faltante'];
          const isUploading = uploadingIndex === index;

          return (
            <Card
              key={doc.tipo}
              className={cn(
                'transition-all duration-300',
                documentoAtual?.status === 'validado' && 'border-[hsl(var(--green-approved))] bg-[hsl(var(--green-approved)_/_0.05)]',
                documentoAtual?.status === 'rejeitado' && 'border-[hsl(var(--red-rejected))] bg-[hsl(var(--red-rejected)_/_0.05)]'
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-sm">{doc.label}</CardTitle>
                      {doc.obrigatorio && (
                        <Badge variant="destructive" className="text-xs">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <StatusIcon className={cn('h-4 w-4', statusColors[documentoAtual?.status || 'faltante'])} />
                      <span className={cn('text-xs font-medium', statusColors[documentoAtual?.status || 'faltante'])}>
                        {statusLabels[documentoAtual?.status || 'faltante']}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {!documentoAtual?.arquivo && !documentoAtual?.url ? (
                  <div className="space-y-2">
                    <Label htmlFor={`file-${index}`} className="cursor-pointer">
                      <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg hover:bg-accent/50 transition-colors">
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                            <span className="text-sm text-muted-foreground">Processando...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              Clique para fazer upload
                            </span>
                          </div>
                        )}
                      </div>
                    </Label>
                    <Input
                      id={`file-${index}`}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                      disabled={isUploading}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Formatos aceitos: PDF, JPG, PNG (máx. 10MB)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">
                          {documentoAtual.arquivo?.name || 'Documento enviado'}
                        </p>
                        {documentoAtual.arquivo && (
                          <p className="text-xs text-muted-foreground">
                            {(documentoAtual.arquivo.size / 1024).toFixed(2)} KB
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          // Visualizar documento
                          if (documentoAtual.arquivo) {
                            const url = URL.createObjectURL(documentoAtual.arquivo);
                            window.open(url, '_blank');
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {documentoAtual?.status === 'rejeitado' && documentoAtual?.observacoes && (
                  <Alert variant="destructive" className="mt-3">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {documentoAtual.observacoes}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Exibir OCRResultCard se houver resultado */}
                {ocrResults[index] && documentoAtual?.arquivo && (
                  <div className="mt-3">
                    <OCRResultCard
                      ocrResult={ocrResults[index]}
                      field={doc as any}
                      uploadedFile={documentoAtual.arquivo}
                      onAccept={() => {
                        update(index, { ...documentoAtual, status: 'validado' });
                        toast.success('✅ Dados do OCR aceitos');
                      }}
                      onReject={() => {
                        handleRemoveFile(index);
                        setOcrResults(prev => {
                          const newResults = { ...prev };
                          delete newResults[index];
                          return newResults;
                        });
                        toast.info('Arquivo removido. Faça novo upload.');
                      }}
                      onReupload={() => {
                        handleRemoveFile(index);
                        setOcrResults(prev => {
                          const newResults = { ...prev };
                          delete newResults[index];
                          return newResults;
                        });
                        toast.info('Faça novo upload do arquivo.');
                      }}
                    />
                  </div>
                )}

                {documentoAtual?.status === 'validado' && !ocrResults[index] && (
                  <Alert className="mt-3 border-[hsl(var(--green-approved))] bg-[hsl(var(--green-approved)_/_0.1)]">
                    <CheckCircle2 className="h-4 w-4 text-[hsl(var(--green-approved))]" />
                    <AlertDescription className="text-xs text-[hsl(var(--green-approved))]">
                      Documento validado com sucesso
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          ⚡ <strong>Validações automáticas:</strong> Após o upload, o sistema irá verificar a
          qualidade e legibilidade dos documentos através de OCR. Documentos com baixa qualidade
          serão sinalizados para reenvio.
        </AlertDescription>
      </Alert>
    </div>
  );
}
