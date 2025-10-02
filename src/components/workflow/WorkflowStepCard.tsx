import { GripVertical, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkflowStep } from "@/types/workflow";
import { cn } from "@/lib/utils";

interface WorkflowStepCardProps {
  step: WorkflowStep;
  isActive?: boolean;
  isCompleted?: boolean;
  isDragging?: boolean;
  onEdit?: () => void;
  dragHandleProps?: any;
}

const stepColors: Record<string, string> = {
  submissao: "bg-blue-500/10 border-blue-500/30 text-blue-400",
  analise_documentos: "bg-purple-500/10 border-purple-500/30 text-purple-400",
  validacao_tecnica: "bg-orange-500/10 border-orange-500/30 text-orange-400",
  aprovacao_diretoria: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  homologacao: "bg-green-500/10 border-green-500/30 text-green-400",
  pendente_correcao: "bg-red-500/10 border-red-500/30 text-red-400",
  rejeitado: "bg-gray-500/10 border-gray-500/30 text-gray-400",
  aprovado: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
};

export function WorkflowStepCard({
  step,
  isActive,
  isCompleted,
  isDragging,
  onEdit,
  dragHandleProps,
}: WorkflowStepCardProps) {
  const colorClass = stepColors[step.type] || stepColors.submissao;

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover:shadow-lg cursor-pointer",
        isDragging && "opacity-50 rotate-2",
        isActive && "ring-2 ring-primary shadow-xl",
        isCompleted && "opacity-60"
      )}
      onClick={onEdit}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {dragHandleProps && (
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing pt-1">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={cn("font-medium", colorClass)}>
                Etapa {step.order}
              </Badge>
              {isActive && <CheckCircle2 className="h-4 w-4 text-green-400 animate-pulse" />}
              {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-400" />}
            </div>

            <h4 className="font-semibold text-base mb-1 truncate">{step.name}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">{step.description}</p>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {step.daysToComplete && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{step.daysToComplete} dias</span>
                </div>
              )}
              {step.requiredDocuments && step.requiredDocuments.length > 0 && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{step.requiredDocuments.length} docs</span>
                </div>
              )}
              {step.autoAdvance && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>Auto</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
