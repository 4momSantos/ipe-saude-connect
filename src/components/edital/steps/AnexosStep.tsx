import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormControl, FormItem, FormMessage, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, X, Loader2, FileCheck, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AnexosStepProps {
  form: UseFormReturn<any>;
}

const anexosTipos = [
  { id: "minuta", label: "Minuta do Contrato", icon: FileText, description: "Modelo de contrato" },
  { id: "planilha", label: "Planilha Orçamentária", icon: FileText, description: "Valores e custos" },
  { id: "edital_pdf", label: "PDF do Edital", icon: FileText, description: "Documento oficial" },
  { id: "outros", label: "Outros Anexos", icon: FileText, description: "Documentos complementares" },
];

export function AnexosStep({ form }: AnexosStepProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  
  // Sprint 4: Anexos agora vêm do template, não do workflow
  const anexosProcesso = form.watch("anexos_processo_esperados") || [];
  const hasAnexosProcesso = anexosProcesso.length > 0;
  const templateId = form.watch("inscription_template_id");

  const handleFileUpload = async (tipo: string, file: File) => {
    try {
      setUploading(tipo);
      
      const fileName = `${tipo}_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from("edital-anexos")
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("edital-anexos")
        .getPublicUrl(fileName);

      const currentAnexos = form.getValues("anexos_administrativos") || {};
      form.setValue("anexos_administrativos", {
        ...currentAnexos,
        [tipo]: {
          url: publicUrl,
          nome: file.name,
          tamanho: file.size,
          tipo: file.type,
          uploadedAt: new Date().toISOString(),
        },
      });

    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveFile = async (tipo: string) => {
    try {
      const currentAnexos = form.getValues("anexos_administrativos") || {};
      const anexo = currentAnexos[tipo];
      
      if (anexo?.url) {
        const fileName = anexo.url.split('/').pop();
        await supabase.storage
          .from("edital-anexos")
          .remove([fileName]);
      }

      const newAnexos = { ...currentAnexos };
      delete newAnexos[tipo];
      form.setValue("anexos_administrativos", newAnexos);
    } catch (error) {
      console.error("Erro ao remover arquivo:", error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Seção 1: Anexos do Processo de Credenciamento (Read-only) */}
      {hasAnexosProcesso && (
        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-green-600" />
              Sprint 4: Anexos do Template de Inscrição
            </h2>
            <p className="text-muted-foreground">
              Documentos que serão solicitados aos candidatos (definidos no template selecionado)
            </p>
          </div>

          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Estes anexos vêm do Template de Inscrição selecionado no passo anterior.
              {!templateId && " Selecione um template no passo de Workflow para ver os anexos."}
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {anexosProcesso.map((anexo: any) => (
              <Card key={anexo.id} className="border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-base">{anexo.label}</CardTitle>
                    </div>
                    {anexo.required && (
                      <Badge variant="destructive" className="text-xs">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium">Formulário:</span> {anexo.nodeName}
                  </p>
                  {anexo.acceptedFiles && (
                    <p>
                      <span className="font-medium">Formatos:</span> {anexo.acceptedFiles.join(", ")}
                    </p>
                  )}
                  {anexo.maxFileSize && (
                    <p>
                      <span className="font-medium">Tamanho máximo:</span> {(anexo.maxFileSize / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Seção 2: Anexos Administrativos do Edital */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Anexos Administrativos do Edital
          </h2>
          <p className="text-muted-foreground">
            Documentos administrativos gerais do edital (PDF do edital, minuta, planilhas, etc.)
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {anexosTipos.map((tipo) => {
            const currentAnexos = form.watch("anexos_administrativos") || {};
            const anexo = currentAnexos[tipo.id];
            const Icon = tipo.icon;

            return (
              <Card key={tipo.id}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {tipo.label}
                  </CardTitle>
                  <CardDescription>{tipo.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!anexo ? (
                    <div className="space-y-2">
                      <Label htmlFor={`file-${tipo.id}`} className="cursor-pointer">
                        <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors text-center">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium">Clique para fazer upload</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, DOC, DOCX (máx. 10MB)
                          </p>
                        </div>
                      </Label>
                      <Input
                        id={`file-${tipo.id}`}
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(tipo.id, file);
                        }}
                        disabled={uploading === tipo.id}
                      />
                      {uploading === tipo.id && (
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Enviando...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{anexo.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {(anexo.tamanho / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(tipo.id)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <FormField
          control={form.control}
          name="anexos_administrativos"
          render={() => (
            <FormItem className="mt-4">
              <FormDescription>
                Formatos aceitos: PDF, DOC, DOCX • Tamanho máximo: 10MB por arquivo
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
