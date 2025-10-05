import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Copy, Workflow } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";

interface DbWorkflow {
  id: string;
  name: string;
  description: string | null;
  nodes: any;
  edges: any;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

export default function Workflows() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar workflows do banco
  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("list-workflows");

      if (error) throw error;

      // Converter workflows do banco para o formato do template
      const convertedTemplates: WorkflowTemplate[] = (data as DbWorkflow[]).map((wf) => ({
        id: wf.id,
        name: wf.name,
        description: wf.description || "",
        steps: extractStepsFromNodes(wf.nodes),
        createdAt: wf.created_at,
        updatedAt: wf.updated_at,
        isActive: wf.is_active,
        version: wf.version,
      }));

      setTemplates(convertedTemplates);
    } catch (error) {
      console.error("Erro ao carregar workflows:", error);
      toast.error("Erro ao carregar workflows");
    } finally {
      setIsLoading(false);
    }
  };

  // Extrair steps dos nodes para exibição
  const extractStepsFromNodes = (nodes: any): any[] => {
    if (!Array.isArray(nodes)) return [];
    
    return nodes
      .filter((node: any) => node.data?.type !== "start" && node.data?.type !== "end")
      .map((node: any, index: number) => ({
        id: node.id,
        name: node.data?.label || "Etapa",
        type: node.data?.type || "unknown",
        order: index + 1,
        description: node.data?.description || "",
        color: node.data?.color || "blue",
        icon: node.data?.icon || "Circle",
        daysToComplete: 1,
      }));
  };

  const handleCreateNew = () => {
    navigate("/workflow-editor");
  };

  const handleEdit = (template: WorkflowTemplate) => {
    navigate(`/workflow-editor?id=${template.id}`);
  };

  const handleDuplicate = async (template: WorkflowTemplate) => {
    try {
      // Buscar o workflow completo
      const { data: workflow, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("id", template.id)
        .single();

      if (error) throw error;

      // Salvar cópia
      const { error: saveError } = await supabase.functions.invoke("save-workflow", {
        body: {
          name: `${workflow.name} (Cópia)`,
          description: workflow.description,
          nodes: workflow.nodes,
          edges: workflow.edges,
        },
      });

      if (saveError) throw saveError;

      toast.success("Workflow duplicado com sucesso!");
      loadWorkflows();
    } catch (error) {
      console.error("Erro ao duplicar workflow:", error);
      toast.error("Erro ao duplicar workflow");
    }
  };

  const handleDelete = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      try {
        const { error } = await supabase
          .from("workflows")
          .delete()
          .eq("id", templateToDelete);

        if (error) throw error;

        toast.success("Workflow excluído com sucesso!");
        loadWorkflows();
      } catch (error) {
        console.error("Erro ao excluir workflow:", error);
        toast.error("Erro ao excluir workflow");
      }
    }
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const criarWorkflowCredenciamento = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const workflowData = {
        name: "Fluxo de Credenciamento Completo",
        description: "Workflow automático com formulário → aprovação → assinatura → database → notificação",
        nodes: [
          { id: "start-1", type: "start", position: { x: 100, y: 100 }, data: { type: "start", label: "Início", triggerConfig: { type: "form_submitted" } } },
          { id: "form-1", type: "form", position: { x: 100, y: 200 }, data: { type: "form", label: "Formulário de Inscrição" } },
          { id: "approval-1", type: "approval", position: { x: 100, y: 300 }, data: { type: "approval", label: "Aprovação Analista", approvalConfig: { assignmentType: "all" } } },
          { id: "email-aprovado", type: "email", position: { x: 100, y: 400 }, data: { type: "email", label: "Email Aprovação" } },
          { id: "signature-1", type: "signature", position: { x: 100, y: 500 }, data: { type: "signature", label: "Assinatura Digital" } },
          { id: "database-1", type: "database", position: { x: 100, y: 600 }, data: { type: "database", label: "Atualizar Status" } },
          { id: "email-confirmacao", type: "email", position: { x: 100, y: 700 }, data: { type: "email", label: "Email Confirmação" } },
          { id: "end-1", type: "end", position: { x: 100, y: 800 }, data: { type: "end", label: "Concluído" } }
        ],
        edges: [
          { id: "e1", source: "start-1", target: "form-1" },
          { id: "e2", source: "form-1", target: "approval-1" },
          { id: "e3", source: "approval-1", target: "email-aprovado" },
          { id: "e4", source: "email-aprovado", target: "signature-1" },
          { id: "e5", source: "signature-1", target: "database-1" },
          { id: "e6", source: "database-1", target: "email-confirmacao" },
          { id: "e7", source: "email-confirmacao", target: "end-1" }
        ]
      };

      const { error: saveError } = await supabase.functions.invoke("save-workflow", {
        body: workflowData,
      });

      if (saveError) throw saveError;

      toast.success("✅ Template de credenciamento criado!");
      loadWorkflows();
    } catch (error) {
      console.error("Erro ao criar template:", error);
      toast.error("Erro ao criar template de credenciamento");
    }
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
        <div className="flex gap-2">
          <Button onClick={criarWorkflowCredenciamento} variant="outline" size="lg">
            🚀 Template de Credenciamento
          </Button>
          <Button onClick={handleCreateNew} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Criar Workflow
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Carregando workflows...</div>
        </div>
      ) : templates.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Nenhum workflow criado</h3>
              <p className="text-muted-foreground">
                Crie seu primeiro workflow para começar a automatizar processos
              </p>
            </div>
            <Button onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Workflow
            </Button>
          </div>
        </Card>
      ) : (
        <>
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
        </>
      )}

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este workflow? Esta ação não pode ser desfeita.
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