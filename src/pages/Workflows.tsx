import { useState } from "react";
import { Plus, Edit, Trash2, Copy, Eye, Workflow } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WorkflowTemplate } from "@/types/workflow";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Mock data inicial
const mockTemplates: WorkflowTemplate[] = [
  {
    id: "template-1",
    name: "Credenciamento Padrão",
    description: "Workflow padrão para processos de credenciamento geral",
    steps: [
      {
        id: "step-1",
        name: "Submissão",
        type: "submissao",
        order: 1,
        description: "Envio inicial da solicitação",
        color: "blue",
        icon: "FileText",
        daysToComplete: 1,
      },
      {
        id: "step-2",
        name: "Análise de Documentos",
        type: "analise_documentos",
        order: 2,
        description: "Verificação da documentação",
        color: "purple",
        icon: "FileCheck",
        daysToComplete: 5,
      },
      {
        id: "step-3",
        name: "Aprovação Final",
        type: "aprovacao_diretoria",
        order: 3,
        description: "Aprovação pela diretoria",
        color: "green",
        icon: "CheckCircle",
        daysToComplete: 3,
      },
    ],
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    isActive: true,
    version: 1,
  },
  {
    id: "template-2",
    name: "Credenciamento Urgente",
    description: "Workflow simplificado para casos urgentes",
    steps: [
      {
        id: "step-1",
        name: "Submissão",
        type: "submissao",
        order: 1,
        description: "Envio inicial da solicitação",
        color: "blue",
        icon: "FileText",
        daysToComplete: 1,
      },
      {
        id: "step-2",
        name: "Aprovação Rápida",
        type: "aprovacao_diretoria",
        order: 2,
        description: "Aprovação rápida",
        color: "green",
        icon: "CheckCircle",
        daysToComplete: 1,
      },
    ],
    createdAt: "2024-02-01T10:00:00Z",
    updatedAt: "2024-02-01T10:00:00Z",
    isActive: true,
    version: 1,
  },
];

export default function Workflows() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>(mockTemplates);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const handleCreateNew = () => {
    navigate("/workflow-editor");
  };

  const handleEdit = (template: WorkflowTemplate) => {
    navigate(`/workflow-editor?id=${template.id}`);
  };

  const handleDuplicate = (template: WorkflowTemplate) => {
    const newTemplate: WorkflowTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    setTemplates([...templates, newTemplate]);
    toast.success("Workflow duplicado com sucesso!");
  };

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      setTemplates(templates.filter(t => t.id !== templateToDelete));
      toast.success("Workflow excluído com sucesso!");
    }
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Gestão de Workflows</h1>
          <p className="text-muted-foreground">
            Configure e gerencie fluxos de credenciamento personalizados
          </p>
        </div>
        <Button onClick={handleCreateNew} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          Criar Workflow
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Workflows
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workflows Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {templates.filter(t => t.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Etapas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {templates.reduce((acc, t) => acc + t.steps.length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Workflows */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="hover:shadow-lg transition-all duration-300 group"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{template.name}</CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description}
                  </p>
                </div>
                {template.isActive && (
                  <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-400 border-green-500/30">
                    Ativo
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div>
                  <span className="font-semibold text-foreground">
                    {template.steps.length}
                  </span>{" "}
                  etapas
                </div>
                <div>
                  v{template.version}
                </div>
                <div className="ml-auto">
                  {format(new Date(template.updatedAt), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(template)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicate(template)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(template.id)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este workflow? Esta ação não afetará
              processos em andamento, mas impedirá a criação de novos processos com
              este fluxo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
