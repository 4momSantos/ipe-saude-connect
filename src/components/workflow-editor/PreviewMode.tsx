import { Settings } from "lucide-react";
import { FormField } from "@/types/workflow-editor";
import { FieldPreview } from "./FieldPreview";
import { Button } from "@/components/ui/button";

interface PreviewModeProps {
  formTitle: string;
  formDescription: string;
  fields: FormField[];
  onExitPreview: () => void;
}

export function PreviewMode({ formTitle, formDescription, fields, onExitPreview }: PreviewModeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-8">
      <div className="max-w-3xl mx-auto">
        <Button
          onClick={onExitPreview}
          variant="outline"
          className="mb-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <Settings className="w-4 h-4 mr-2" />
          Voltar ao Editor
        </Button>
        
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">{formTitle || "Formulário sem título"}</h1>
          {formDescription && (
            <p className="text-muted-foreground mb-8">{formDescription}</p>
          )}
          
          <div className="space-y-6">
            {fields.map((field) => (
              <div key={field.id}>
                {field.type !== 'checkbox' && (
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    {field.label}
                    {field.validation?.required && <span className="text-destructive ml-1">*</span>}
                  </label>
                )}
                <FieldPreview field={field} />
                {field.helpText && (
                  <p className="text-xs text-muted-foreground mt-1.5">{field.helpText}</p>
                )}
              </div>
            ))}
          </div>
          
          {fields.length > 0 && (
            <Button className="mt-8 w-full" size="lg">
              Enviar Formulário
            </Button>
          )}
          
          {fields.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhum campo adicionado ao formulário
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
