import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, FieldType } from "@/types/workflow-editor";
import { FieldTypesSidebar } from "./FieldTypesSidebar";
import { FormEditorMain } from "./FormEditorMain";
import { FieldConfigPanel } from "./FieldConfigPanel";
import { PreviewMode } from "./PreviewMode";

interface FormBuilderProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  allWorkflowFields?: Array<FormField & { nodeName?: string }>;
}

export function FormBuilder({ fields, onChange, allWorkflowFields = [] }: FormBuilderProps) {
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [formTitle, setFormTitle] = useState("Formulário sem título");
  const [formDescription, setFormDescription] = useState("");

  const addField = (type: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type,
      label: `Campo ${fields.length + 1}`,
      size: "full",
      validation: {},
      placeholder: "",
      apiConfig: ['cpf', 'cnpj', 'crm', 'nit', 'cep'].includes(type) 
        ? { validateOnBlur: true, enableAutoFill: true }
        : undefined,
    };
    onChange([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const selectedField = fields.find(f => f.id === selectedFieldId) || null;

  if (previewMode) {
    return (
      <PreviewMode
        formTitle={formTitle}
        formDescription={formDescription}
        fields={fields}
        onExitPreview={() => setPreviewMode(false)}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Field Types */}
      <FieldTypesSidebar onAddField={addField} />

      {/* Main Editor */}
      <div className="flex-1 flex flex-col">
        {/* Header with Preview Button */}
        <div className="h-14 border-b border-border px-6 flex items-center justify-between bg-card/50">
          <h3 className="font-semibold text-foreground">Editor de Formulário</h3>
          <Button
            onClick={() => setPreviewMode(true)}
            variant="default"
            size="sm"
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Visualizar
          </Button>
        </div>

        {/* Editor Content */}
        <FormEditorMain
          fields={fields}
          formTitle={formTitle}
          formDescription={formDescription}
          selectedFieldId={selectedFieldId}
          onFieldsChange={onChange}
          onTitleChange={setFormTitle}
          onDescriptionChange={setFormDescription}
          onSelectField={setSelectedFieldId}
          onDeleteField={deleteField}
        />
      </div>

      {/* Right Panel - Configuration */}
      <FieldConfigPanel
        field={selectedField}
        allFields={fields}
        onUpdateField={(updates) => {
          if (selectedFieldId) {
            updateField(selectedFieldId, updates);
          }
        }}
        allWorkflowFields={allWorkflowFields}
      />
    </div>
  );
}
