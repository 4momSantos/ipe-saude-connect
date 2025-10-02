import { useState } from "react";
import { X, Save, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormBuilder } from "./FormBuilder";
import { FormPreview } from "./FormPreview";
import { WorkflowNodeData, FormField, FormTemplate } from "@/types/workflow-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConfigPanelProps {
  nodeData: WorkflowNodeData;
  onUpdate: (data: Partial<WorkflowNodeData>) => void;
  onClose: () => void;
  templates: FormTemplate[];
  onSaveTemplate: (template: Omit<FormTemplate, "id" | "createdAt" | "updatedAt">) => void;
}

export function ConfigPanel({ 
  nodeData, 
  onUpdate, 
  onClose,
  templates,
  onSaveTemplate 
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState("config");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      toast.error("Digite um nome para o template");
      return;
    }

    onSaveTemplate({
      name: templateName,
      description: templateDescription,
      fields: nodeData.formFields || [],
    });

    setTemplateName("");
    setTemplateDescription("");
    toast.success("Template salvo com sucesso!");
  };

  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onUpdate({
        formFields: [...template.fields],
        formTemplateId: templateId,
      });
      toast.success("Template carregado!");
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-l">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold">{nodeData.label}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {nodeData.type}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="form">Formulário</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome da Etapa</Label>
                <Input
                  value={nodeData.label}
                  onChange={(e) => onUpdate({ label: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={nodeData.description || ""}
                  onChange={(e) => onUpdate({ description: e.target.value })}
                  placeholder="Descreva o que esta etapa faz..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input
                  value={nodeData.category || ""}
                  onChange={(e) => onUpdate({ category: e.target.value })}
                  placeholder="Ex: Credenciamento, Análise"
                />
              </div>

              {nodeData.type === "form" && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <Label className="mb-2 block">Carregar Template</Label>
                    <Select onValueChange={loadTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {templates.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Nenhum template disponível
                      </p>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="form" className="space-y-4 mt-4">
              {nodeData.type === "form" ? (
                <>
                  <FormBuilder
                    fields={nodeData.formFields || []}
                    onChange={(fields) => onUpdate({ formFields: fields })}
                  />

                  {(nodeData.formFields?.length || 0) > 0 && (
                    <div className="pt-4 border-t space-y-3">
                      <h4 className="text-sm font-semibold">Salvar como Template</h4>
                      <div className="space-y-2">
                        <Label>Nome do Template</Label>
                        <Input
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          placeholder="Ex: Formulário de Inscrição"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Textarea
                          value={templateDescription}
                          onChange={(e) => setTemplateDescription(e.target.value)}
                          placeholder="Descreva o propósito deste template..."
                          rows={3}
                        />
                      </div>
                      <Button onClick={handleSaveTemplate} className="w-full">
                        <Copy className="h-4 w-4 mr-2" />
                        Salvar Template
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Este tipo de etapa não possui formulário configurável.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              {nodeData.type === "form" ? (
                <div className="p-4 rounded-lg border bg-background/50">
                  <FormPreview fields={nodeData.formFields || []} />
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Preview não disponível para este tipo de etapa.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
