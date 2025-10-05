import { useState } from "react";
import { GripVertical, Trash2, Settings } from "lucide-react";
import { FormField } from "@/types/workflow-editor";
import { FieldPreview } from "./FieldPreview";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FormEditorMainProps {
  fields: FormField[];
  formTitle: string;
  formDescription: string;
  selectedFieldId: string | null;
  onFieldsChange: (fields: FormField[]) => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
}

export function FormEditorMain({
  fields,
  formTitle,
  formDescription,
  selectedFieldId,
  onFieldsChange,
  onTitleChange,
  onDescriptionChange,
  onSelectField,
  onDeleteField,
}: FormEditorMainProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...fields];
    const draggedField = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedField);
    
    onFieldsChange(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedIndex(null);
  };

  const isAPIField = (field: FormField) => {
    return ['cpf', 'cnpj', 'crm', 'nit', 'cep'].includes(field.type);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        {/* Form Header */}
        <div className="mb-8">
          <input
            type="text"
            value={formTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-3xl font-bold text-foreground bg-transparent border-none focus:outline-none focus:ring-0 w-full placeholder:text-muted-foreground"
            placeholder="Título do Formulário"
          />
          <input
            type="text"
            value={formDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Adicione uma descrição..."
            className="text-muted-foreground bg-transparent border-none focus:outline-none focus:ring-0 w-full mt-2 placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Fields Area */}
        <div className="bg-card rounded-xl shadow-sm border border-border p-6 min-h-[500px]">
          {fields.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Settings className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhum campo adicionado</p>
              <p className="text-sm mt-1">Clique em um tipo de campo na barra lateral para começar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => onSelectField(field.id)}
                  className={cn(
                    "p-4 border-2 rounded-lg cursor-move transition-all duration-200",
                    selectedFieldId === field.id
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border hover:border-primary/50 hover:shadow-sm",
                    draggedIndex === index && "opacity-50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0 cursor-grab active:cursor-grabbing" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <label className="text-sm font-semibold text-foreground">
                          {field.label}
                          {field.validation?.required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </label>
                        {isAPIField(field) && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            API
                          </Badge>
                        )}
                      </div>
                      
                      <FieldPreview field={field} />
                      
                      {field.helpText && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {field.helpText}
                        </p>
                      )}
                    </div>
                    
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteField(field.id);
                      }}
                      className="flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
