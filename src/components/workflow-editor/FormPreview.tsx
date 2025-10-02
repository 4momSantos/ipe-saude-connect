import { FormField, FieldSize } from "@/types/workflow-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormPreviewProps {
  fields: FormField[];
}

const sizeClasses: Record<FieldSize, string> = {
  full: "col-span-12",
  half: "col-span-12 md:col-span-6",
  third: "col-span-12 md:col-span-4",
};

export function FormPreview({ fields }: FormPreviewProps) {
  if (fields.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum campo configurado.</p>
        <p className="text-sm">Adicione campos para ver a pré-visualização.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      {fields.map((field) => (
        <div key={field.id} className={cn("space-y-2", sizeClasses[field.size])}>
          <Label>
            {field.label}
            {field.validation?.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          
          {field.type === "textarea" ? (
            <Textarea
              placeholder={field.placeholder}
              disabled
              rows={4}
            />
          ) : field.type === "select" ? (
            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Selecione..."} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === "checkbox" ? (
            <div className="flex items-center space-x-2">
              <Checkbox disabled />
              <span className="text-sm">{field.placeholder || field.label}</span>
            </div>
          ) : field.type === "file" ? (
            <Input type="file" disabled />
          ) : (
            <Input
              type={field.type === "cpf" || field.type === "cnpj" ? "text" : field.type}
              placeholder={field.placeholder}
              disabled
            />
          )}
          
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      ))}
    </div>
  );
}
