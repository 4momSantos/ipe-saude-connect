import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Workflow, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Play,
  AlertCircle,
  FileText,
  Mail,
  Database,
  Globe
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WorkflowStatusCardProps {
  inscricaoId: string;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  current_node_id: string | null;
  error_message: string | null;
  workflows: {
    name: string;
    version: number;
  };
}

interface StepExecution {
  id: string;
  node_id: string;
  node_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export function WorkflowStatusCard({ inscricaoId }: WorkflowStatusCardProps) {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [steps, setSteps] = useState<StepExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflowStatus();
    
    // Subscrever para atualizações em tempo real
    const channel = supabase
      .channel(`workflow-${inscricaoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_executions',
          filter: `id=eq.${execution?.id}`
        },
        () => {
          loadWorkflowStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId, execution?.id]);

  async function loadWorkflowStatus() {
    try {
      // Buscar execução da workflow para esta inscrição
      const { data: inscricao, error: inscricaoError } = await supabase
        .from("inscricoes_edital")
        .select("workflow_execution_id")
        .eq("id", inscricaoId)
        .maybeSingle();

      if (inscricaoError) {
        console.error("Erro ao buscar inscrição:", inscricaoError);
        setLoading(false);
        return;
      }

      if (!inscricao?.workflow_execution_id) {
        setLoading(false);
        return;
      }

      // Buscar detalhes da execução
      const { data: executionData, error: executionError } = await supabase
        .from("workflow_executions")
        .select(`
          *,
          workflows (
            name,
            version
          )
        `)
        .eq("id", inscricao.workflow_execution_id)
        .maybeSingle();

      if (executionError) {
        console.error("Erro ao buscar execução:", executionError);
        setLoading(false);
        return;
      }

      if (executionData) {
        setExecution(executionData as any);

        // Buscar steps executados
        const { data: stepsData, error: stepsError } = await supabase
          .from("workflow_step_executions")
          .select("*")
          .eq("execution_id", executionData.id)
          .order("created_at", { ascending: true });

        if (stepsError) {
          console.error("Erro ao buscar steps:", stepsError);
        } else {
          setSteps(stepsData || []);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar status da workflow:", error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      running: { label: "Em Execução", variant: "default" },
      completed: { label: "Concluído", variant: "secondary" },
      failed: { label: "Falhou", variant: "destructive" },
      pending: { label: "Pendente", variant: "outline" }
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  function getStepIcon(nodeType: string) {
    const icons: Record<string, any> = {
      form: FileText,
      email: Mail,
      database: Database,
      http: Globe,
      approval: AlertCircle,
      start: Play,
      end: CheckCircle2
    };
    const Icon = icons[nodeType] || Clock;
    return <Icon className="h-4 w-4" />;
  }

  function getStepStatusIcon(status: string) {
    const icons: Record<string, any> = {
      completed: CheckCircle2,
      running: Clock,
      failed: XCircle,
      pending: Clock
    };
    const Icon = icons[status] || Clock;
    return <Icon className="h-4 w-4" />;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!execution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Status da Workflow
          </CardTitle>
          <CardDescription>
            Esta inscrição não possui workflow vinculada.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            {execution.workflows?.name || "Workflow"}
          </CardTitle>
          {getStatusBadge(execution.status)}
        </div>
        <CardDescription>
          {execution.workflows?.version && `Versão ${execution.workflows.version} • `}
          Iniciada em {new Date(execution.started_at).toLocaleString('pt-BR')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {execution.error_message && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <div>
              <p className="font-medium">Erro na Execução</p>
              <p className="text-sm">{execution.error_message}</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium text-sm">Progresso</h4>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <div className="flex-shrink-0 mt-1">
                  {getStepIcon(step.node_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm capitalize">
                      {step.node_type.replace('_', ' ')}
                    </p>
                    <div className="flex items-center gap-1">
                      {getStepStatusIcon(step.status)}
                      <span className="text-xs text-muted-foreground">
                        {step.status === 'completed' ? 'Concluído' :
                         step.status === 'running' ? 'Em execução' :
                         step.status === 'failed' ? 'Falhou' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                  {step.error_message && (
                    <p className="text-xs text-destructive mt-1">{step.error_message}</p>
                  )}
                  {step.started_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(step.started_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {execution.completed_at && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Concluída em:</span>
              <span className="font-medium">
                {new Date(execution.completed_at).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
