import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow, User, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WorkflowStepProps {
  form: UseFormReturn<any>;
}

interface WorkflowOption {
  id: string;
  name: string;
  description: string;
  nodes: any[];
  version: number;
  is_active: boolean;
}

interface GestorOption {
  id: string;
  nome: string;
  email: string;
}

export function WorkflowStep({ form }: WorkflowStepProps) {
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [gestores, setGestores] = useState<GestorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowOption | null>(null);

  useEffect(() => {
    loadWorkflows();
    loadGestores();
  }, []);

  useEffect(() => {
    const workflowId = form.watch("workflow_id");
    if (workflowId) {
      const workflow = workflows.find(w => w.id === workflowId);
      setSelectedWorkflow(workflow || null);
    } else {
      setSelectedWorkflow(null);
    }
  }, [form.watch("workflow_id"), workflows]);

  async function loadWorkflows() {
    try {
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Converter nodes de Json para array
      const workflowsData = (data || []).map(w => ({
        ...w,
        nodes: Array.isArray(w.nodes) ? w.nodes : JSON.parse(w.nodes as string || '[]')
      }));
      
      setWorkflows(workflowsData);
    } catch (error) {
      console.error("Erro ao carregar workflows:", error);
    }
  }

  async function loadGestores() {
    try {
      console.log('[WorkflowStep] Carregando gestores via RPC...');
      
      // Usar função RPC ao invés de query direta
      const { data, error } = await supabase.rpc('get_gestores');

      if (error) {
        console.error('[WorkflowStep] Erro ao carregar gestores:', error);
        toast.error("Erro ao carregar lista de gestores");
        setGestores([]);
        return;
      }
      
      console.log(`[WorkflowStep] ✅ ${data?.length || 0} gestor(es) carregado(s)`);
      setGestores(data || []);
      
      if (!data || data.length === 0) {
        toast.warning("Nenhum gestor disponível no sistema");
      }
    } catch (error) {
      console.error('[WorkflowStep] Exceção ao carregar gestores:', error);
      toast.error("Erro inesperado ao carregar gestores");
      setGestores([]);
    } finally {
      setLoading(false);
    }
  }

  function getNodeTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      start: "Início",
      form: "Formulário",
      approval: "Aprovação",
      notification: "Notificação",
      condition: "Condição",
      end: "Fim",
      webhook: "Webhook",
      http: "HTTP",
      signature: "Assinatura",
      email: "Email",
      database: "Banco de Dados"
    };
    return labels[type] || type;
  }

  function getNodeTypeIcon(type: string) {
    const icons: Record<string, any> = {
      form: CheckCircle2,
      approval: AlertCircle,
      default: Clock
    };
    const Icon = icons[type] || icons.default;
    return <Icon className="h-4 w-4" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          Vinculação de Workflow
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Vincule um fluxo de trabalho automatizado para processar as inscrições deste edital.
          Isso é opcional, mas permite automatizar aprovações, validações e notificações.
        </p>
      </div>

      <FormField
        control={form.control}
        name="workflow_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Workflow (Opcional)</FormLabel>
            <Select
              onValueChange={(value) => {
                field.onChange(value === "none" ? null : value);
                if (value !== "none") {
                  const workflow = workflows.find(w => w.id === value);
                  if (workflow) {
                    form.setValue("workflow_version", workflow.version);
                  }
                }
              }}
              value={field.value || "none"}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma workflow" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">Nenhuma workflow</SelectItem>
                {workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name} (v{workflow.version})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Apenas workflows ativas podem ser vinculadas ao edital.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedWorkflow && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              {selectedWorkflow.name}
            </CardTitle>
            <CardDescription>{selectedWorkflow.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Etapas do Fluxo</span>
                <Badge variant="outline">{selectedWorkflow.nodes.length} nós</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedWorkflow.nodes.map((node: any, index: number) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {getNodeTypeIcon(node.type)}
                    {getNodeTypeLabel(node.type)}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <FormField
                control={form.control}
                name="gestor_autorizador_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gestor Autorizador *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o gestor responsável" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {gestores.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground text-center">
                            <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="font-semibold">Nenhum gestor disponível</p>
                            <p className="text-xs mt-1">
                              Contate o administrador para criar perfis de gestores
                            </p>
                          </div>
                        ) : (
                          gestores.map((gestor) => (
                            <SelectItem key={gestor.id} value={gestor.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{gestor.nome}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({gestor.email})
                                </span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Gestor responsável por autorizar a vinculação desta workflow ao edital.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes_autorizacao"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Observações da Autorização</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Justificativa ou observações sobre a escolha desta workflow..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Documente o motivo da escolha desta workflow e eventuais considerações.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
