import { useState } from "react";
import { X, Save, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormBuilder } from "./FormBuilder";
import { FormPreview } from "./FormPreview";
import { WebhookConfigPanel } from "./WebhookConfig";
import { HttpConfigPanel } from "./HttpConfig";
import { SignatureConfigPanel } from "./SignatureConfig";
import { EmailConfigPanel } from "./EmailConfig";
import { DatabaseConfigPanel } from "./DatabaseConfig";
import { ApprovalConfigPanel, ApprovalConfig } from "./ApprovalConfig";
import { ConditionConfigPanel, ConditionConfig } from "./ConditionConfig";
import { ConditionalExpressionConfigPanel } from "./ConditionalExpressionConfig";
import { TriggerConfigPanel } from "./TriggerConfig";
import { LoopConfigPanel } from "./LoopConfig";
import { TemplateSelector } from "@/components/templates/TemplateSelector";
import { WorkflowNodeData, FormField, FormTemplate } from "@/types/workflow-editor";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Node } from "@xyflow/react";
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
  onDelete: () => void;
  templates: FormTemplate[];
  onSaveTemplate: (template: Omit<FormTemplate, "id" | "createdAt" | "updatedAt">) => void;
  allWorkflowNodes?: Node<WorkflowNodeData>[];
}

export function ConfigPanel({ 
  nodeData, 
  onUpdate, 
  onClose,
  onDelete,
  templates,
  onSaveTemplate,
  allWorkflowNodes = []
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState("config");
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  // Extrair todos os campos de todos os formulários do workflow
  const allWorkflowFields: Array<FormField & { nodeName?: string }> = allWorkflowNodes
    .filter(node => node.data.type === 'form' && node.data.formFields)
    .flatMap(node => 
      (node.data.formFields || []).map(field => ({
        ...field,
        nodeName: node.data.label // Adicionar nome do nó para identificação
      }))
    );

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
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
        <div>
          <h3 className="font-semibold">{nodeData.label}</h3>
          <p className="text-sm text-muted-foreground capitalize">
            {nodeData.type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {nodeData.type !== 'start' && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-4 pr-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="config">Config</TabsTrigger>
              <TabsTrigger value="advanced">Avançado</TabsTrigger>
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
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              {nodeData.type === "start" && (
                <TriggerConfigPanel
                  config={nodeData.triggerConfig || { type: "manual" }}
                  onChange={(config) => onUpdate({ triggerConfig: config })}
                />
              )}

              {nodeData.type === "form" && (
                <div className="space-y-4">
                  <TemplateSelector
                    selectedTemplateId={nodeData.formTemplateId}
                    onSelect={(templateId, fields) => {
                      onUpdate({ 
                        formTemplateId: templateId,
                        formFields: fields 
                      });
                    }}
                  />

                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    <p>💡 Você pode usar um template ou editar os campos diretamente abaixo.</p>
                  </div>

                  <FormBuilder
                    fields={nodeData.formFields || []}
                    onChange={(fields: FormField[]) =>
                      onUpdate({ formFields: fields })
                    }
                    allWorkflowFields={allWorkflowFields}
                  />
                </div>
              )}

              {nodeData.type === "webhook" && (
                <WebhookConfigPanel
                  config={nodeData.webhookConfig || { method: "POST" }}
                  onChange={(config) => onUpdate({ webhookConfig: config })}
                />
              )}

              {nodeData.type === "http" && (
                <HttpConfigPanel
                  config={nodeData.httpConfig || { method: "GET" }}
                  onChange={(config) => onUpdate({ httpConfig: config })}
                />
              )}

              {nodeData.type === "signature" && (
                <SignatureConfigPanel
                  config={nodeData.signatureConfig || { provider: "manual", signers: [] }}
                  onChange={(config) => onUpdate({ signatureConfig: config })}
                />
              )}

              {nodeData.type === "email" && (
                <EmailConfigPanel
                  config={nodeData.emailConfig || {}}
                  onChange={(config) => onUpdate({ emailConfig: config })}
                />
              )}

              {nodeData.type === "database" && (
                <DatabaseConfigPanel
                  config={nodeData.databaseConfig || { operation: "select" }}
                  onChange={(config) => onUpdate({ databaseConfig: config })}
                />
              )}

              {nodeData.type === "approval" && (
                <ApprovalConfigPanel
                  config={nodeData.approvalConfig || { assignmentType: "all" }}
                  onChange={(config) => onUpdate({ approvalConfig: config })}
                />
              )}

              {nodeData.type === "condition" && (
                <Tabs defaultValue="expression" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="expression">Expressão Automática</TabsTrigger>
                    <TabsTrigger value="approval">Aprovação Manual</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="expression" className="space-y-4">
                    <ConditionalExpressionConfigPanel
                      config={nodeData.conditionalExpression || {
                        mode: 'visual',
                        visualRules: []
                      }}
                      onChange={(config) => onUpdate({ conditionalExpression: config })}
                    />
                  </TabsContent>
                  
                  <TabsContent value="approval" className="space-y-4">
                    <ConditionConfigPanel
                      config={nodeData.conditionConfig || { assignmentType: "all" }}
                      onChange={(config) => onUpdate({ conditionConfig: config })}
                    />
                  </TabsContent>
                </Tabs>
              )}

              {nodeData.type === "loop" && (
                <LoopConfigPanel
                  config={nodeData.loopConfig || {
                    items: '',
                    executionMode: 'sequential',
                    itemVariable: 'currentItem',
                    indexVariable: 'index',
                    continueOnError: true,
                    iterationTimeout: 30000,
                    checkpointEvery: 100
                  }}
                  onChange={(config) => onUpdate({ loopConfig: config })}
                  allNodes={allWorkflowNodes}
                />
              )}

              {!["start", "form", "webhook", "http", "signature", "email", "database", "approval", "condition", "loop"].includes(nodeData.type) && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Este tipo de etapa não possui configuração avançada.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              {nodeData.type === "form" && nodeData.formFields ? (
                <div className="p-4 rounded-lg border bg-background/50">
                  <FormPreview fields={nodeData.formFields} />
                </div>
              ) : nodeData.type === "form" ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Selecione um template para visualizar o preview</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Preview disponível apenas para formulários.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
