import { UseFormReturn, useFieldArray } from 'react-hook-form';
import { InscricaoCompletaForm, DOCUMENTOS_OBRIGATORIOS } from '@/lib/inscricao-validation';
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
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DocumentosStepProps {
  form: UseFormReturn<InscricaoCompletaForm>;
}

const statusIcons = {
  pendente: AlertTriangle,
  validado: CheckCircle2,
  rejeitado: XCircle,
  faltante: Upload,
};

const statusColors = {
  pendente: 'text-[hsl(var(--orange-warning))]',
  validado: 'text-[hsl(var(--green-approved))]',
  rejeitado: 'text-[hsl(var(--red-rejected))]',
  faltante: 'text-muted-foreground',
};

const statusLabels = {
  pendente: 'Em análise',
  validado: 'Validado',
  rejeitado: 'Rejeitado',
  faltante: 'Não enviado',
};

export function DocumentosStep({ form }: DocumentosStepProps) {
  const { fields, update } = useFieldArray({
    control: form.control,
    name: 'documentos',
  });

  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleFileChange = async (index: number, file: File | null) => {
    if (!file) return;

    setUploadingIndex(index);

    // Simulação de validação OCR (em produção, seria uma chamada à API)
    setTimeout(() => {
      update(index, {
        ...fields[index],
        arquivo: file,
        status: 'pendente',
      });
      setUploadingIndex(null);
    }, 1500);
  };

  const handleRemoveFile = (index: number) => {
    update(index, {
      ...fields[index],
      arquivo: undefined,
      status: 'faltante',
    });
  };

  const documentosObrigatoriosList = DOCUMENTOS_OBRIGATORIOS.filter(d => d.obrigatorio);
  const documentosEnviados = fields.filter(d => 
    (d.arquivo || d.url) && 
    documentosObrigatoriosList.some(doc => doc.tipo === d.tipo)
  ).length;
  const progress = Math.min((documentosEnviados / documentosObrigatoriosList.length) * 100, 100);

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
              {documentosEnviados} de {documentosObrigatoriosList.length} documentos obrigatórios
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

      {/* Lista de documentos */}
      <div className="space-y-3">
        {DOCUMENTOS_OBRIGATORIOS.map((doc, index) => {
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

                {documentoAtual?.status === 'validado' && (
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
