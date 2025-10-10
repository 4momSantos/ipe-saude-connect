// FASE 11: Timeline visual com animações e real-time para execuções
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Loader2,
  FileSignature,
  Mail,
  UserCheck,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStep {
  id: string;
  node_id: string;
  node_type: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  input_data: any;
  output_data: any;
}

interface WorkflowExecutionTimelineProps {
  execution_id: string;
  className?: string;
}

const nodeIcons: Record<string, any> = {
  start: Clock,
  form: FileSignature,
  email: Mail,
  approval: UserCheck,
  condition: ChevronRight,
  end: CheckCircle2,
};

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  pending: { 
    bg: 'bg-secondary/20 dark:bg-secondary/10', 
    text: 'text-secondary-foreground', 
    icon: Clock 
  },
  running: { 
    bg: 'bg-primary/20 dark:bg-primary/10', 
    text: 'text-primary', 
    icon: Loader2 
  },
  completed: { 
    bg: 'bg-emerald-500/20 dark:bg-emerald-500/10', 
    text: 'text-emerald-600 dark:text-emerald-400', 
    icon: CheckCircle2 
  },
  failed: { 
    bg: 'bg-destructive/20 dark:bg-destructive/10', 
    text: 'text-destructive', 
    icon: XCircle 
  },
};

export function WorkflowExecutionTimeline({ execution_id, className }: WorkflowExecutionTimelineProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!execution_id) {
      setLoading(false);
      return;
    }

    loadSteps();

    // Real-time subscription
    const channel = supabase
      .channel(`workflow-${execution_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_step_executions',
          filter: `execution_id=eq.${execution_id}`,
        },
        () => {
          loadSteps();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [execution_id]);

  const loadSteps = async () => {
    if (!execution_id) return;
    
    try {
      const { data, error } = await supabase
        .from('workflow_step_executions')
        .select('*')
        .eq('execution_id', execution_id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar steps:', error);
        throw error;
      }
      
      setSteps(data || []);
    } catch (error) {
      console.error('Erro ao carregar steps:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (steps.length === 0) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma etapa registrada ainda
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6", className)}>
      <h3 className="text-lg font-semibold mb-6">Timeline do Workflow</h3>

      <div className="relative">
        {/* Linha vertical conectando os steps */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-6">
          {steps.map((step, index) => {
            const statusConfig = statusColors[step.status] || statusColors.pending;
            const NodeIcon = nodeIcons[step.node_type] || ChevronRight;
            const StatusIcon = statusConfig.icon;

            return (
              <div 
                key={step.id} 
                className="relative flex gap-4 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Ícone do nó */}
                <div className={cn(
                  "relative z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                  "border-2 border-border shadow-sm",
                  statusConfig.bg
                )}>
                  <NodeIcon className={cn("h-5 w-5", statusConfig.text)} />
                  
                  {/* Badge de status sobreposto */}
                  <div className="absolute -bottom-1 -right-1">
                    <StatusIcon 
                      className={cn(
                        "h-4 w-4 bg-background rounded-full",
                        statusConfig.text,
                        step.status === 'running' && 'animate-spin'
                      )} 
                    />
                  </div>
                </div>

                {/* Conteúdo do step */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {step.input_data?.label || step.node_type}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", statusConfig.text)}
                        >
                          {step.status}
                        </Badge>
                      </div>

                      {step.started_at && (
                        <p className="text-sm text-muted-foreground">
                          Iniciado: {new Date(step.started_at).toLocaleString('pt-BR')}
                        </p>
                      )}

                      {step.completed_at && (
                        <p className="text-sm text-muted-foreground">
                          Concluído: {new Date(step.completed_at).toLocaleString('pt-BR')}
                        </p>
                      )}

                      {step.error_message && (
                        <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-destructive">{step.error_message}</p>
                          </div>
                        </div>
                      )}

                      {step.output_data && Object.keys(step.output_data).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                            Ver detalhes
                          </summary>
                          <pre className="mt-2 p-3 rounded-lg bg-muted text-xs overflow-x-auto">
                            {JSON.stringify(step.output_data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
