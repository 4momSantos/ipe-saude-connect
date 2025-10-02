import { CheckCircle2, Circle, Clock, XCircle } from "lucide-react";
import { WorkflowStep, WorkflowAction } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentStepId: string;
  actions?: WorkflowAction[];
  className?: string;
}

const stepIcons: Record<string, any> = {
  completed: CheckCircle2,
  active: Clock,
  pending: Circle,
  rejected: XCircle,
};

export function WorkflowTimeline({
  steps,
  currentStepId,
  actions = [],
  className,
}: WorkflowTimelineProps) {
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);

  const getStepStatus = (index: number) => {
    if (index < currentStepIndex) return "completed";
    if (index === currentStepIndex) return "active";
    return "pending";
  };

  const getStepAction = (stepId: string) => {
    return actions.find(action => action.stepId === stepId);
  };

  return (
    <div className={cn("relative", className)}>
      {steps.map((step, index) => {
        const status = getStepStatus(index);
        const action = getStepAction(step.id);
        const Icon = stepIcons[status];
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative pb-8">
            {/* Linha conectora */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-4 top-8 w-0.5 h-full -ml-px transition-colors duration-500",
                  status === "completed" ? "bg-primary" : "bg-muted"
                )}
              />
            )}

            {/* Conteúdo da etapa */}
            <div className="relative flex items-start gap-4 group">
              {/* Ícone */}
              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300",
                  status === "completed" && "bg-primary border-primary text-primary-foreground",
                  status === "active" && "bg-background border-primary text-primary animate-pulse",
                  status === "pending" && "bg-muted border-muted-foreground/20 text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex items-center gap-2 mb-1">
                  <h4
                    className={cn(
                      "font-semibold text-sm transition-colors",
                      status === "completed" && "text-foreground",
                      status === "active" && "text-primary",
                      status === "pending" && "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </h4>
                  {status === "active" && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                      Em andamento
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mb-2">{step.description}</p>

                {action && (
                  <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">
                        {action.performedBy}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(action.performedAt), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    {action.comment && (
                      <p className="text-xs text-muted-foreground mt-1">{action.comment}</p>
                    )}
                  </div>
                )}

                {status === "pending" && step.daysToComplete && (
                  <div className="text-xs text-muted-foreground">
                    Prazo estimado: {step.daysToComplete} dias
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
