import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, XCircle, FileCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PublicacaoStepProps {
  form: UseFormReturn<any>;
}

const statusOptions = [
  { 
    value: "rascunho", 
    label: "Rascunho", 
    description: "Edital em elaboração, não visível publicamente",
    icon: AlertCircle,
    color: "text-yellow-600 bg-yellow-50 border-yellow-200"
  },
  { 
    value: "publicado", 
    label: "Publicado", 
    description: "Edital ativo e disponível para inscrições",
    icon: CheckCircle2,
    color: "text-green-600 bg-green-50 border-green-200"
  },
  { 
    value: "encerrado", 
    label: "Encerrado", 
    description: "Edital finalizado, não aceita mais inscrições",
    icon: XCircle,
    color: "text-red-600 bg-red-50 border-red-200"
  },
];

export function PublicacaoStep({ form }: PublicacaoStepProps) {
  const selectedStatus = form.watch("status") || "rascunho";
  const currentOption = statusOptions.find(opt => opt.value === selectedStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Publicação e Controle</h3>
          <p className="text-sm text-muted-foreground">Defina o status e revise as informações</p>
        </div>
      </div>

      <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent border-2">
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-base font-semibold">Status do Edital *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {currentOption && (
          <Card className={`mt-4 p-4 border-2 ${currentOption.color}`}>
            <div className="flex items-start gap-3">
              <currentOption.icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">{currentOption.label}</p>
                <p className="text-sm mt-1 opacity-90">{currentOption.description}</p>
              </div>
            </div>
          </Card>
        )}
      </Card>

      <Card className="p-6 bg-card/50">
        <h4 className="font-semibold mb-4">Resumo do Edital</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Número do Edital:</span>
            <span className="font-medium">{form.watch("numero_edital") || "—"}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Objeto:</span>
            <span className="font-medium truncate ml-4 max-w-xs">{form.watch("objeto") || "—"}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Critério:</span>
            <span className="font-medium">{form.watch("criterio_julgamento") || "—"}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Participantes:</span>
            <span className="font-medium">
              {form.watch("participacao_permitida")?.length || 0} tipo(s)
            </span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-muted-foreground">Documentos Exigidos:</span>
            <span className="font-medium">
              {form.watch("documentos_habilitacao")?.length || 0} categoria(s)
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Anexos:</span>
            <span className="font-medium">
              {Object.keys(form.watch("anexos") || {}).length} arquivo(s)
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Importante
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              Ao publicar o edital, ele ficará visível para todos os candidatos. 
              Certifique-se de que todas as informações estão corretas antes de publicar.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
