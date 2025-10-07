import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Workflow, User, CheckCircle2, AlertCircle, Clock, ClipboardList, FormInput } from "lucide-react";
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

interface FormularioVinculado {
  id: string;
  nome: string;
  tipo: string;
  ordem: number;
  node_id: string;
}

export function WorkflowStep({ form }: WorkflowStepProps) {
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [gestores, setGestores] = useState<GestorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowOption | null>(null);
  const [formulariosVinculados, setFormulariosVinculados] = useState<FormularioVinculado[]>([]);

  useEffect(() => {
    loadWorkflows();
    loadGestores();
  }, []);

  useEffect(() => {
    const workflowId = form.watch("workflow_id");
    if (workflowId) {
      const workflow = workflows.find(w => w.id === workflowId);
      if (workflow) {
        setSelectedWorkflow(workflow);
        handleWorkflowChange(workflow);
      }
    } else {
      setSelectedWorkflow(null);
      setFormulariosVinculados([]);
    }
  }, [form.watch("workflow_id"), workflows]);

  async function handleWorkflowChange(workflow: WorkflowOption) {
    try {
      // 1. Extrair nós do tipo "form"
      const formNodes = workflow.nodes.filter((n: any) => n.type === 'form');
      
      if (formNodes.length === 0) {
        setFormulariosVinculados([]);
        form.setValue('formularios_vinculados', []);
        toast.warning("⚠️ Este workflow não possui formulários. Adicione nós do tipo 'Formulário' no editor.");
        return;
      }
      
      // 2. Buscar dados reais dos formulários
      const formIds = formNodes
        .map((n: any) => n.data?.formConfig?.templateId)
        .filter(Boolean);

      if (formIds.length === 0) {
        setFormulariosVinculados([]);
        form.setValue('formularios_vinculados', []);
        toast.warning("⚠️ Os nós de formulário não estão configurados. Configure os templates no editor.");
        return;
      }

      const { data: templates, error } = await supabase
        .from('form_templates')
        .select('id, name, category')
        .in('id', formIds);

      if (error) {
        console.error("Erro ao buscar templates:", error);
        toast.error("Erro ao carregar formulários do workflow");
        return;
      }

      // 3. Montar lista com ordem dos nós
      const formularios = formNodes.map((node: any, index: number) => {
        const template = templates?.find(t => t.id === node.data?.formConfig?.templateId);
        return {
          id: template?.id || '',
          nome: template?.name || node.data?.label || 'Formulário sem nome',
          tipo: template?.category || 'Não definido',
          ordem: index + 1,
          node_id: node.id
        };
      }).filter(f => f.id); // Remover formulários sem template

      setFormulariosVinculados(formularios);
      
      // 4. Atualizar form com IDs dos formulários
      form.setValue('formularios_vinculados', formularios.map(f => f.id));
      
      console.log(`[WorkflowStep] ✅ ${formularios.length} formulário(s) extraído(s) do workflow`);
      toast.success(`${formularios.length} formulário(s) vinculado(s) automaticamente`);
      
    } catch (error) {
      console.error("Erro ao processar workflow:", error);
      toast.error("Erro ao processar formulários do workflow");
    }
  }

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
          Vinculação de Workflow *
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Selecione o modelo de processo que gerenciará as inscrições deste edital.
          Os formulários serão extraídos automaticamente do workflow escolhido.
        </p>
      </div>

      <FormField
        control={form.control}
        name="workflow_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo de Workflow *</FormLabel>
            <Select
              onValueChange={(value) => {
                const currentWorkflowId = field.value;
                
                // Confirmar troca de workflow
                if (currentWorkflowId && currentWorkflowId !== value) {
                  if (!window.confirm("⚠️ Trocar de workflow substituirá os formulários vinculados. Deseja continuar?")) {
                    return;
                  }
                }
                
                field.onChange(value);
                const workflow = workflows.find(w => w.id === value);
                if (workflow) {
                  form.setValue("workflow_version", workflow.version);
                }
              }}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modelo de processo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id}>
                    {workflow.name} (v{workflow.version})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              O workflow define o fluxo de processamento das inscrições.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedWorkflow && (
        <>
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Formulários do Workflow
                </CardTitle>
                <Badge variant="secondary">
                  {formulariosVinculados.length} formulário(s)
                </Badge>
              </div>
              <CardDescription>
                Formulários extraídos automaticamente dos nós do tipo "form"
              </CardDescription>
            </CardHeader>
            <CardContent>
              {formulariosVinculados.length === 0 ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    Este workflow não possui nós do tipo "Formulário". 
                    Adicione pelo menos um formulário no editor de workflow.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {formulariosVinculados.map((form, index) => (
                    <div key={form.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{form.nome}</p>
                          <p className="text-xs text-muted-foreground">{form.tipo}</p>
                        </div>
                      </div>
                      <FormInput className="h-5 w-5 text-primary" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Detalhes do Workflow
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
        </>
      )}
    </div>
  );
}
