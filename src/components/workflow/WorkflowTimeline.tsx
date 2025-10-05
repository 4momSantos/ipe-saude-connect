// WorkflowTimeline original - para visualização de steps estáticos
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkflowStep, WorkflowAction } from "@/types/workflow";

interface WorkflowTimelineProps {
  steps: WorkflowStep[];
  currentStepId: string;
  actions?: WorkflowAction[];
}

const getStepIcon = (type: string) => {
  switch (type) {
    case "aprovado":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "rejeitado":
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
};

const getStepColor = (step: WorkflowStep, currentStepId: string) => {
  if (step.id === currentStepId) {
    return "border-primary bg-primary/10";
  }
  return "border-border bg-background";
};

export function WorkflowTimeline({ steps, currentStepId, actions = [] }: WorkflowTimelineProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const isCurrentStep = step.id === currentStepId;
        const stepActions = actions.filter(a => a.stepId === step.id);
        
        return (
          <div key={step.id} className="relative">
            {index < steps.length - 1 && (
              <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
            )}
            
            <div className={cn(
              "flex gap-4 p-4 rounded-lg border transition-all",
              getStepColor(step, currentStepId),
              isCurrentStep && "shadow-md"
            )}>
              <div className="flex-shrink-0 mt-1">
                {getStepIcon(step.type)}
              </div>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium">{step.name}</h4>
                    {step.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {step.description}
                      </p>
                    )}
                  </div>
                  
                  <Badge 
                    variant={isCurrentStep ? "default" : "outline"}
                    className={cn(
                      step.color,
                      "flex-shrink-0"
                    )}
                  >
                    Etapa {step.order}
                  </Badge>
                </div>

                {step.requiredDocuments && step.requiredDocuments.length > 0 && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Documentos:</span>
                    <ul className="mt-1 list-disc list-inside">
                      {step.requiredDocuments.map((doc, i) => (
                        <li key={i} className="text-muted-foreground">{doc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {step.daysToComplete && (
                  <p className="text-sm text-muted-foreground">
                    Prazo: {step.daysToComplete} dias
                  </p>
                )}

                {stepActions.length > 0 && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {stepActions.map((action) => (
                      <div key={action.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {action.action}
                          </Badge>
                          <span className="text-muted-foreground">
                            {new Date(action.performedAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {action.comment && (
                          <p className="mt-1 text-muted-foreground">{action.comment}</p>
                        )}
                      </div>
                    ))}
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
