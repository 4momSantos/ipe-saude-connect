import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Workflow, User, CheckCircle2, AlertCircle, Clock, ClipboardList, FormInput, FileCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { mapWorkflowToEdital, validateWorkflowForEdital } from "@/lib/workflow-edital-mapper";

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

interface InscriptionTemplate {
  id: string;
  name: string;
  description: string;
  anexos_obrigatorios: any[];
  campos_formulario: any[];
}

export function WorkflowStep({ form }: WorkflowStepProps) {
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [gestores, setGestores] = useState<GestorOption[]>([]);
  const [inscriptionTemplates, setInscriptionTemplates] = useState<InscriptionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowOption | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<InscriptionTemplate | null>(null);
  const [formulariosVinculados, setFormulariosVinculados] = useState<FormularioVinculado[]>([]);

  useEffect(() => {
    loadWorkflows();
    loadGestores();
    loadInscriptionTemplates();
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

  useEffect(() => {
    const templateId = form.watch("inscription_template_id");
    if (templateId) {
      const template = inscriptionTemplates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplate(template);
        // Passar anexos do template para o form
        form.setValue("anexos_processo_esperados", template.anexos_obrigatorios);
        console.log(`[WorkflowStep] ✅ Template selecionado: ${template.name} com ${template.anexos_obrigatorios.length} anexo(s)`);
      }
    } else {
      setSelectedTemplate(null);
      form.setValue("anexos_processo_esperados", []);
    }
  }, [form.watch("inscription_template_id"), inscriptionTemplates]);

  async function handleWorkflowChange(workflow: WorkflowOption) {
    try {
      // Sprint 3: Validar workflow de validação/aprovação
      const validation = validateWorkflowForEdital(workflow);
      
      if (!validation.isValid) {
        toast.error("Workflow inválido", {
          description: validation.errors.join(", ")
        });
        return;
      }

      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          toast.warning(warning);
        });
      }

      // Workflows agora não têm formulários (apenas validam)
      console.log(`[WorkflowStep] ✅ Workflow de validação configurado: ${workflow.name}`);
      toast.success("Workflow de validação configurado com sucesso");
      
    } catch (error) {
      console.error("Erro ao processar workflow:", error);
      toast.error("Erro ao processar workflow");
    }
  }

  async function loadInscriptionTemplates() {
    try {
      const { data, error } = await supabase
        .from("inscription_templates")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setInscriptionTemplates(data || []);
      console.log(`[WorkflowStep] ✅ ${data?.length || 0} template(s) de inscrição carregado(s)`);
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      toast.error("Erro ao carregar templates de inscrição");
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
          Sprint 3: Template de Inscrição + Workflow de Validação *
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Escolha o template que define o que o candidato deve enviar e o workflow que validará essas informações.
        </p>
      </div>

      <FormField
        control={form.control}
        name="inscription_template_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Template de Inscrição (Define o que candidato envia) *</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o template de inscrição" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {inscriptionTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Define anexos e campos que o candidato deve preencher na inscrição.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedTemplate && (
        <Card className="border-green-500/20 bg-green-50/30 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheck className="h-5 w-5 text-green-600" />
              Template: {selectedTemplate.name}
            </CardTitle>
            <CardDescription>{selectedTemplate.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-medium">
                📎 {selectedTemplate.anexos_obrigatorios.length} anexo(s) obrigatório(s)
              </p>
              <p className="text-sm font-medium">
                📝 {selectedTemplate.campos_formulario.length} campo(s) de formulário
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <FormField
        control={form.control}
        name="workflow_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Workflow de Validação (Define como processar) *</FormLabel>
            <Select
              onValueChange={(value) => {
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
                  <SelectValue placeholder="Selecione o workflow de validação" />
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
              Define o fluxo de aprovação/validação das inscrições (não coleta dados).
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {selectedWorkflow && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Workflow className="h-4 w-4" />
                Detalhes do Workflow de Validação
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
