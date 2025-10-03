import { FormField } from "@/types/workflow-editor";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TemplatePreviewProps {
  name: string;
  description?: string;
  fields: FormField[];
}

export function TemplatePreview({ name, description, fields }: TemplatePreviewProps) {
  const renderField = (field: FormField) => {
    const baseProps = {
      disabled: true,
      placeholder: field.placeholder || "",
    };

    switch (field.type) {
      case "textarea":
        return <Textarea {...baseProps} />;
      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox disabled />
            <span className="text-sm">{field.label}</span>
          </div>
        );
      case "select":
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma opção" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return <Input {...baseProps} type={field.type} />;
    }
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case "full":
        return "col-span-12";
      case "half":
        return "col-span-12 md:col-span-6";
      case "third":
        return "col-span-12 md:col-span-4";
      default:
        return "col-span-12";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{name}</h2>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold mb-4">Preview do Formulário</h3>
        <div className="grid grid-cols-12 gap-4">
          {fields.map((field) => (
            <div key={field.id} className={getSizeClass(field.size)}>
              {field.type !== "checkbox" && (
                <Label className="mb-2 block">
                  {field.label}
                  {field.validation?.required && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </Label>
              )}
              {renderField(field)}
              {field.helpText && (
                <p className="text-xs text-muted-foreground mt-1">
                  {field.helpText}
                </p>
              )}
            </div>
          ))}
        </div>
        {fields.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum campo adicionado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
