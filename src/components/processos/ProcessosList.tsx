import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit, Copy, Trash2, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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

interface ProcessStep {
  id: string;
  step_number: number;
  step_name: string;
  template_id: string;
  is_required: boolean;
  template?: {
    name: string;
    fields: any[];
  };
}

interface InscriptionProcess {
  id: string;
  name: string;
  description: string;
  category: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  steps: ProcessStep[];
}

export function ProcessosList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processos, setProcessos] = useState<InscriptionProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadProcessos();
  }, []);

  const loadProcessos = async () => {
    try {
      const { data: processosData, error: processosError } = await supabase
        .from("inscription_processes")
        .select("*")
        .order("created_at", { ascending: false });

      if (processosError) throw processosError;

      // Carregar steps para cada processo
      const processosWithSteps = await Promise.all(
        (processosData || []).map(async (processo) => {
          const { data: stepsData, error: stepsError } = await supabase
            .from("process_steps")
            .select(`
              *,
              template:form_templates(name, fields)
            `)
            .eq("process_id", processo.id)
            .order("step_number", { ascending: true });

          if (stepsError) throw stepsError;

          return {
            ...processo,
            steps: (stepsData || []).map((step: any) => ({
              id: step.id,
              step_number: step.step_number,
              step_name: step.step_name,
              template_id: step.template_id,
              is_required: step.is_required,
              template: step.template ? {
                name: step.template.name,
                fields: Array.isArray(step.template.fields) ? step.template.fields : []
              } : undefined
            })),
          };
        })
      );

      setProcessos(processosWithSteps);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar processos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    navigate("/formularios/processos/criar");
  };

  const handleEdit = (id: string) => {
    navigate(`/formularios/processos/editar/${id}`);
  };

  const handleDuplicate = async (processo: InscriptionProcess) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      // Criar processo duplicado
      const { data: newProcesso, error: processoError } = await supabase
        .from("inscription_processes")
        .insert({
          name: `${processo.name} (Cópia)`,
          description: processo.description,
          category: processo.category,
          is_active: false,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (processoError) throw processoError;

      // Duplicar steps
      const stepsToInsert = processo.steps.map((step) => ({
        process_id: newProcesso.id,
        step_number: step.step_number,
        step_name: step.step_name,
        template_id: step.template_id,
        is_required: step.is_required,
        conditional_rules: null,
      }));

      const { error: stepsError } = await supabase
        .from("process_steps")
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;

      toast({
        title: "Processo duplicado",
        description: "O processo foi duplicado com sucesso.",
      });

      loadProcessos();
    } catch (error: any) {
      toast({
        title: "Erro ao duplicar processo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("inscription_processes")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Processo excluído",
        description: "O processo foi excluído com sucesso.",
      });

      loadProcessos();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir processo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("inscription_processes")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Processo ${!currentStatus ? "ativado" : "desativado"} com sucesso.`,
      });

      loadProcessos();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredProcessos = processos.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Processos de Inscrição</h2>
          <p className="text-sm text-muted-foreground">
            Combine múltiplos templates em processos sequenciais
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Criar Processo
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar processos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      ) : filteredProcessos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {searchQuery
              ? "Nenhum processo encontrado."
              : "Nenhum processo criado ainda."}
          </p>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Primeiro Processo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProcessos.map((processo) => (
            <Card key={processo.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{processo.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {processo.description}
                    </CardDescription>
                  </div>
                  <Badge variant={processo.is_active ? "default" : "secondary"}>
                    {processo.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Etapas:</span>
                    <Badge variant="outline">{processo.steps.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {processo.steps.slice(0, 3).map((step, index) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/50"
                      >
                        <Badge variant="secondary" className="shrink-0">
                          {index + 1}
                        </Badge>
                        <span className="truncate">{step.step_name}</span>
                      </div>
                    ))}
                    {processo.steps.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{processo.steps.length - 3} etapas
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(processo.id)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDuplicate(processo)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(processo.id, processo.is_active)}
                >
                  <Power className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteId(processo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este processo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}