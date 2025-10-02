import { useState } from "react";
import { Plus, Save, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { WorkflowStep, WorkflowTemplate } from "@/types/workflow";
import { WorkflowStepCard } from "./WorkflowStepCard";
import { WorkflowTimeline } from "./WorkflowTimeline";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkflowBuilderProps {
  template?: WorkflowTemplate;
  onSave: (template: WorkflowTemplate) => void;
  onCancel?: () => void;
}

const defaultSteps: Partial<WorkflowStep>[] = [
  {
    name: "Submissão",
    type: "submissao",
    description: "Envio inicial da solicitação de credenciamento",
    color: "blue",
    icon: "FileText",
    daysToComplete: 1,
  },
  {
    name: "Análise de Documentos",
    type: "analise_documentos",
    description: "Verificação da documentação enviada",
    color: "purple",
    icon: "FileCheck",
    daysToComplete: 5,
  },
  {
    name: "Validação Técnica",
    type: "validacao_tecnica",
    description: "Análise técnica dos requisitos",
    color: "orange",
    icon: "ClipboardCheck",
    daysToComplete: 7,
  },
  {
    name: "Aprovação da Diretoria",
    type: "aprovacao_diretoria",
    description: "Aprovação final pela diretoria",
    color: "yellow",
    icon: "UserCheck",
    daysToComplete: 3,
  },
  {
    name: "Homologação",
    type: "homologacao",
    description: "Processo de homologação final",
    color: "green",
    icon: "CheckCircle",
    daysToComplete: 2,
  },
];

export function WorkflowBuilder({ template, onSave, onCancel }: WorkflowBuilderProps) {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [steps, setSteps] = useState<WorkflowStep[]>(
    template?.steps || 
    defaultSteps.map((step, index) => ({
      id: `step-${index + 1}`,
      order: index + 1,
      ...step,
    } as WorkflowStep))
  );
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [isStepDialogOpen, setIsStepDialogOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSteps = [...steps];
    const draggedStep = newSteps[draggedIndex];
    newSteps.splice(draggedIndex, 1);
    newSteps.splice(index, 0, draggedStep);

    // Reordenar
    newSteps.forEach((step, idx) => {
      step.order = idx + 1;
    });

    setSteps(newSteps);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      name: "Nova Etapa",
      type: "analise_documentos",
      order: steps.length + 1,
      description: "Descrição da etapa",
      color: "blue",
      icon: "Circle",
      daysToComplete: 3,
    };
    setEditingStep(newStep);
    setIsStepDialogOpen(true);
  };

  const handleEditStep = (step: WorkflowStep) => {
    setEditingStep({ ...step });
    setIsStepDialogOpen(true);
  };

  const handleSaveStep = () => {
    if (!editingStep) return;

    const existingIndex = steps.findIndex(s => s.id === editingStep.id);
    if (existingIndex >= 0) {
      const newSteps = [...steps];
      newSteps[existingIndex] = editingStep;
      setSteps(newSteps);
    } else {
      setSteps([...steps, editingStep]);
    }

    setIsStepDialogOpen(false);
    setEditingStep(null);
    toast.success("Etapa salva com sucesso!");
  };

  const handleSaveTemplate = () => {
    if (!name.trim()) {
      toast.error("Nome do workflow é obrigatório");
      return;
    }

    if (steps.length === 0) {
      toast.error("Adicione pelo menos uma etapa");
      return;
    }

    const newTemplate: WorkflowTemplate = {
      id: template?.id || `template-${Date.now()}`,
      name,
      description,
      steps,
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: template?.isActive ?? true,
      version: (template?.version || 0) + 1,
    };

    onSave(newTemplate);
    toast.success("Workflow salvo com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">
            {template ? "Editar Workflow" : "Criar Workflow"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure as etapas do processo de credenciamento
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isPreviewMode ? "Editar" : "Visualizar"}
          </Button>
          <Button onClick={handleSaveTemplate}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Workflow
          </Button>
        </div>
      </div>

      {/* Informações básicas */}
      {!isPreviewMode && (
        <div className="grid gap-4 p-6 rounded-lg border bg-card">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome do Workflow</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Credenciamento Padrão"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito deste workflow..."
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Etapas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Etapas do Workflow</h3>
          {!isPreviewMode && (
            <Button onClick={handleAddStep} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Etapa
            </Button>
          )}
        </div>

        {isPreviewMode ? (
          <div className="p-6 rounded-lg border bg-card">
            <WorkflowTimeline
              steps={steps}
              currentStepId={steps[1]?.id || steps[0]?.id}
            />
          </div>
        ) : (
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "transition-transform duration-200",
                  draggedIndex === index && "scale-105"
                )}
              >
                <WorkflowStepCard
                  step={step}
                  isDragging={draggedIndex === index}
                  onEdit={() => handleEditStep(step)}
                  dragHandleProps={{}}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de edição de etapa */}
      <Dialog open={isStepDialogOpen} onOpenChange={setIsStepDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingStep?.order ? `Editar Etapa ${editingStep.order}` : "Nova Etapa"}
            </DialogTitle>
          </DialogHeader>

          {editingStep && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="step-name">Nome da Etapa</Label>
                <Input
                  id="step-name"
                  value={editingStep.name}
                  onChange={(e) =>
                    setEditingStep({ ...editingStep, name: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="step-description">Descrição</Label>
                <Textarea
                  id="step-description"
                  value={editingStep.description}
                  onChange={(e) =>
                    setEditingStep({ ...editingStep, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="step-days">Dias para Conclusão</Label>
                <Input
                  id="step-days"
                  type="number"
                  value={editingStep.daysToComplete || 0}
                  onChange={(e) =>
                    setEditingStep({
                      ...editingStep,
                      daysToComplete: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStepDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStep}>Salvar Etapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
