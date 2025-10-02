import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { FormField, FieldType, FieldSize } from "@/types/workflow-editor";
import { cn } from "@/lib/utils";

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
}

export function FormBuilder({ fields, onChange }: FormBuilderProps) {
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const addField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: "text",
      label: "Novo Campo",
      size: "full",
      validation: {},
    };
    onChange([...fields, newField]);
    setExpandedField(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
    if (expandedField === id) setExpandedField(null);
  };

  const fieldTypeOptions: { value: FieldType; label: string }[] = [
    { value: "text", label: "Texto" },
    { value: "number", label: "Número" },
    { value: "email", label: "Email" },
    { value: "cpf", label: "CPF" },
    { value: "cnpj", label: "CNPJ" },
    { value: "date", label: "Data" },
    { value: "file", label: "Upload" },
    { value: "checkbox", label: "Checkbox" },
    { value: "select", label: "Select" },
    { value: "textarea", label: "Área de Texto" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Campos do Formulário</h4>
        <Button size="sm" variant="outline" onClick={addField}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Campo
        </Button>
      </div>

      <div className="space-y-2">
        {fields.map((field, index) => (
          <Card key={field.id} className="p-3">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{field.label}</span>
                  <span className="text-xs text-muted-foreground capitalize">
                    ({field.type})
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
              >
                {expandedField === field.id ? "Fechar" : "Editar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeField(field.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>

            {expandedField === field.id && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input
                      value={field.label}
                      onChange={(e) => updateField(field.id, { label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={field.type}
                      onValueChange={(value) => updateField(field.id, { type: value as FieldType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldTypeOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tamanho</Label>
                    <Select
                      value={field.size}
                      onValueChange={(value) => updateField(field.id, { size: value as FieldSize })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Largura Total</SelectItem>
                        <SelectItem value="half">1/2</SelectItem>
                        <SelectItem value="third">1/3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Placeholder</Label>
                    <Input
                      value={field.placeholder || ""}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      placeholder="Ex: Digite seu nome"
                    />
                  </div>
                </div>

                {field.type === "select" && (
                  <div className="space-y-2">
                    <Label>Opções (uma por linha)</Label>
                    <Textarea
                      value={field.options?.map(o => `${o.label}:${o.value}`).join("\n") || ""}
                      onChange={(e) => {
                        const options = e.target.value.split("\n").filter(Boolean).map(line => {
                          const [label, value] = line.split(":");
                          return { label: label.trim(), value: (value || label).trim() };
                        });
                        updateField(field.id, { options });
                      }}
                      placeholder="Opção 1:valor1&#10;Opção 2:valor2"
                      rows={4}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Texto de Ajuda</Label>
                  <Input
                    value={field.helpText || ""}
                    onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                    placeholder="Informação adicional para o usuário"
                  />
                </div>

                <div className="space-y-3">
                  <h5 className="text-sm font-medium">Validações</h5>
                  <div className="flex items-center justify-between">
                    <Label>Campo Obrigatório</Label>
                    <Switch
                      checked={field.validation?.required || false}
                      onCheckedChange={(checked) =>
                        updateField(field.id, {
                          validation: { ...field.validation, required: checked }
                        })
                      }
                    />
                  </div>

                  {(field.type === "text" || field.type === "textarea") && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Mín. Caracteres</Label>
                        <Input
                          type="number"
                          value={field.validation?.minLength || ""}
                          onChange={(e) =>
                            updateField(field.id, {
                              validation: { ...field.validation, minLength: parseInt(e.target.value) }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Máx. Caracteres</Label>
                        <Input
                          type="number"
                          value={field.validation?.maxLength || ""}
                          onChange={(e) =>
                            updateField(field.id, {
                              validation: { ...field.validation, maxLength: parseInt(e.target.value) }
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {field.type === "number" && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Valor Mínimo</Label>
                        <Input
                          type="number"
                          value={field.validation?.min || ""}
                          onChange={(e) =>
                            updateField(field.id, {
                              validation: { ...field.validation, min: parseInt(e.target.value) }
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Valor Máximo</Label>
                        <Input
                          type="number"
                          value={field.validation?.max || ""}
                          onChange={(e) =>
                            updateField(field.id, {
                              validation: { ...field.validation, max: parseInt(e.target.value) }
                            })
                          }
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Regex Pattern</Label>
                    <Input
                      value={field.validation?.pattern || ""}
                      onChange={(e) =>
                        updateField(field.id, {
                          validation: { ...field.validation, pattern: e.target.value }
                        })
                      }
                      placeholder="Ex: ^[A-Z].*"
                    />
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}

        {fields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum campo adicionado.</p>
            <p className="text-sm">Clique em "Adicionar Campo" para começar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
