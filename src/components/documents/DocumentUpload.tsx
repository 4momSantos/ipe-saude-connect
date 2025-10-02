import { useState } from "react";
import { Upload, FileText, Image as ImageIcon, Loader2, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ValidationBadge } from "@/components/ValidationBadge";
import { simulateOCR, OCRResult, DocumentType } from "@/lib/ocr-simulator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface DocumentFile {
  id: string;
  file: File;
  type: DocumentType;
  preview?: string;
  ocrResult?: OCRResult;
  status: "uploading" | "processing" | "valid" | "invalid" | "warning";
}

interface DocumentUploadProps {
  onFilesChange?: (files: DocumentFile[]) => void;
  maxFiles?: number;
}

const documentTypeLabels: Record<DocumentType, string> = {
  identity: "Documento de Identidade",
  address_proof: "Comprovante de Endereço",
  certificate: "Certidão/Certificado",
  other: "Outros Documentos"
};

export function DocumentUpload({ onFilesChange, maxFiles = 10 }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>([]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    if (documents.length + newFiles.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    const newDocuments: DocumentFile[] = newFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      type: "other",
      status: "uploading",
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));

    setDocuments(prev => [...prev, ...newDocuments]);

    // Process OCR for each file
    for (const doc of newDocuments) {
      processDocument(doc);
    }
  };

  const processDocument = async (doc: DocumentFile) => {
    setDocuments(prev =>
      prev.map(d => d.id === doc.id ? { ...d, status: "processing" } : d)
    );

    try {
      const ocrResult = await simulateOCR(doc.file);
      
      let status: DocumentFile["status"] = "valid";
      if (ocrResult.errors && ocrResult.errors.length > 0) {
        status = "invalid";
      } else if (ocrResult.warnings && ocrResult.warnings.length > 0) {
        status = "warning";
      }

      setDocuments(prev =>
        prev.map(d =>
          d.id === doc.id
            ? {
                ...d,
                ocrResult,
                type: ocrResult.extractedData?.documentType || "other",
                status,
              }
            : d
        )
      );

      if (status === "invalid") {
        toast.error(`Problemas detectados em ${doc.file.name}`);
      } else if (status === "warning") {
        toast.warning(`Atenção em ${doc.file.name}`);
      } else {
        toast.success(`${doc.file.name} validado com sucesso`);
      }
    } catch (error) {
      setDocuments(prev =>
        prev.map(d => d.id === doc.id ? { ...d, status: "invalid" } : d)
      );
      toast.error(`Erro ao processar ${doc.file.name}`);
    }
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    toast.success("Documento removido");
  };

  const groupedDocuments = documents.reduce((acc, doc) => {
    const type = doc.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<DocumentType, DocumentFile[]>);

  return (
    <div className="space-y-6">
      <Card className="border bg-card card-glow">
        <CardHeader>
          <CardTitle>Upload de Documentos</CardTitle>
          <CardDescription>
            Faça upload dos documentos necessários para análise
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border-2 border-dashed border-border bg-card/50 p-8 text-center hover:border-primary/50 transition-colors">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <label className="cursor-pointer">
              <span className="text-sm text-primary hover:text-primary/80 font-medium">
                Clique para fazer upload
              </span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-2">
              PDF, JPG ou PNG (máx. 5MB por arquivo) • {documents.length}/{maxFiles} arquivos
            </p>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedDocuments).map(([type, docs]) => (
        <Card key={type} className="border bg-card animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg">
              {documentTypeLabels[type as DocumentType]}
            </CardTitle>
            <CardDescription>{docs.length} documento(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border border-border bg-card/50 p-4 transition-all duration-300",
                    "hover:border-primary/50 hover:bg-card/80"
                  )}
                >
                  {doc.preview ? (
                    <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0 border border-border">
                      <img
                        src={doc.preview}
                        alt={doc.file.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(doc.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <ValidationBadge status={doc.status} />
                    </div>

                    {doc.status === "processing" && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Processando OCR...</span>
                      </div>
                    )}

                    {doc.ocrResult && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Confiança:</span>
                          <span className="font-medium text-foreground">
                            {doc.ocrResult.confidence}%
                          </span>
                        </div>

                        {doc.ocrResult.extractedData && (
                          <div className="text-xs space-y-1 p-2 bg-muted/50 rounded">
                            {doc.ocrResult.extractedData.name && (
                              <div>
                                <span className="text-muted-foreground">Nome: </span>
                                <span className="text-foreground">{doc.ocrResult.extractedData.name}</span>
                              </div>
                            )}
                            {doc.ocrResult.extractedData.documentNumber && (
                              <div>
                                <span className="text-muted-foreground">Número: </span>
                                <span className="text-foreground">{doc.ocrResult.extractedData.documentNumber}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {doc.ocrResult.warnings && doc.ocrResult.warnings.length > 0 && (
                          <div className="space-y-1">
                            {doc.ocrResult.warnings.map((warning, i) => (
                              <p key={i} className="text-xs text-[hsl(var(--orange-warning))]">
                                ⚠ {warning}
                              </p>
                            ))}
                          </div>
                        )}

                        {doc.ocrResult.errors && doc.ocrResult.errors.length > 0 && (
                          <div className="space-y-1">
                            {doc.ocrResult.errors.map((error, i) => (
                              <p key={i} className="text-xs text-[hsl(var(--red-rejected))]">
                                ✕ {error}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeDocument(doc.id)}
                        className="h-7 text-xs"
                      >
                        Remover
                      </Button>
                      {doc.preview && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(doc.preview, "_blank")}
                          className="h-7 text-xs"
                        >
                          <ImageIcon className="h-3 w-3 mr-1" />
                          Visualizar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
