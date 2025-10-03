import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { FileText, Upload, X, FileCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AnexosStepProps {
  form: UseFormReturn<any>;
}

const anexosTipos = [
  { id: "minuta_contrato", label: "Minuta do Contrato", description: "Anexo I - Modelo de contrato", icon: FileText },
  { id: "planilha_custos", label: "Planilha de Custos", description: "Anexo II - Orçamento detalhado", icon: FileText },
  { id: "folha_dados", label: "Folha de Dados", description: "Anexo V - Especificações técnicas", icon: FileText },
  { id: "termo_referencia", label: "Termo de Referência", description: "Anexo VI - Descrição técnica", icon: FileText },
];

export function AnexosStep({ form }: AnexosStepProps) {
  const [uploading, setUploading] = useState<string | null>(null);
  const anexos = form.watch("anexos") || {};

  const handleFileUpload = async (tipoAnexo: string, file: File) => {
    try {
      setUploading(tipoAnexo);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${tipoAnexo}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('edital-anexos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('edital-anexos')
        .getPublicUrl(filePath);

      const currentAnexos = form.getValues("anexos") || {};
      form.setValue("anexos", {
        ...currentAnexos,
        [tipoAnexo]: {
          url: data.path,
          publicUrl,
          fileName: file.name,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
        }
      });

      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveFile = async (tipoAnexo: string) => {
    try {
      const anexo = anexos[tipoAnexo];
      if (anexo?.url) {
        await supabase.storage
          .from('edital-anexos')
          .remove([anexo.url]);
      }

      const currentAnexos = form.getValues("anexos") || {};
      const { [tipoAnexo]: removed, ...rest } = currentAnexos;
      form.setValue("anexos", rest);

      toast.success("Arquivo removido");
    } catch (error) {
      console.error("Erro ao remover arquivo:", error);
      toast.error("Erro ao remover arquivo");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Anexos do Edital</h3>
          <p className="text-sm text-muted-foreground">Faça upload dos documentos complementares</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {anexosTipos.map((tipo) => {
          const Icon = tipo.icon;
          const anexo = anexos[tipo.id];
          const isUploading = uploading === tipo.id;

          return (
            <Card key={tipo.id} className="p-6 hover:shadow-md transition-all border-2 hover:border-primary/50">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{tipo.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{tipo.description}</p>
                  </div>
                </div>

                {anexo ? (
                  <div className="bg-accent/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">Arquivo enviado</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{anexo.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(anexo.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(tipo.id)}
                      className="w-full mt-2"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(tipo.id, file);
                      }}
                      className="cursor-pointer"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                        <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <FormField
        control={form.control}
        name="anexos"
        render={() => (
          <FormItem>
            <FormDescription className="text-center mt-6">
              Formatos aceitos: PDF, DOC, DOCX, XLS, XLSX • Tamanho máximo: 50MB por arquivo
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
