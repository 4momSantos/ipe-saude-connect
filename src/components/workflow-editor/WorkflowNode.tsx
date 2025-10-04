import { Handle, Position } from "@xyflow/react";
import { 
  FileText, 
  CheckCircle, 
  Mail, 
  GitBranch, 
  Play, 
  StopCircle,
  LucideIcon,
  Check
} from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow-editor";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  FileText,
  CheckCircle,
  Mail,
  GitBranch,
  Play,
  StopCircle,
};

const typeLabels: Record<string, string> = {
  start: "Trigger",
  form: "Form",
  approval: "Approval",
  notification: "Notification",
  condition: "Condition",
  end: "End",
};

interface WorkflowNodeProps {
  data: WorkflowNodeData;
  selected: boolean;
}

export function WorkflowNode({ data, selected }: WorkflowNodeProps) {
  const Icon = iconMap[data.icon] || FileText;
  const isCompleted = data.status === "completed";

  return (
    <div
      className={cn(
        "relative bg-card rounded-xl border shadow-sm transition-all duration-200",
        "min-w-[280px] max-w-[320px]",
        "hover:shadow-md hover:border-primary/30",
        selected && "ring-2 ring-primary shadow-lg border-primary"
      )}
    >
      {data.type !== "start" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
        />
      )}
      
      {/* Status Badge */}
      {isCompleted && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge 
            variant="outline" 
            className="bg-green-500/10 text-green-600 border-green-500/30 gap-1 pr-2"
          >
            <Check className="h-3 w-3" />
            Completed
          </Badge>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${data.color}15` }}
          >
            <Icon className="h-5 w-5" style={{ color: data.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {typeLabels[data.type] || data.type}
              </span>
            </div>
            <h4 className="font-semibold text-base leading-tight">
              {data.label}
            </h4>
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Form Fields Info */}
        {data.formFields && data.formFields.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {data.formFields.length} campo{data.formFields.length !== 1 ? "s" : ""} configurado{data.formFields.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Type Badge */}
        {data.category && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {data.category}
            </Badge>
          </div>
        )}
      </div>

      {/* Handles de saída para condição (dois handles: Sim e Não) */}
      {data.type === "condition" ? (
        <>
          <Handle
            id="yes"
            type="source"
            position={Position.Right}
            style={{ top: '35%' }}
            className="!w-3 !h-3 !bg-green-500 !border-2 !border-background"
          />
          <div className="absolute right-3 top-[30%] text-[10px] font-semibold text-green-600 pointer-events-none">
            SIM
          </div>
          <Handle
            id="no"
            type="source"
            position={Position.Right}
            style={{ top: '65%' }}
            className="!w-3 !h-3 !bg-red-500 !border-2 !border-background"
          />
          <div className="absolute right-3 top-[60%] text-[10px] font-semibold text-red-600 pointer-events-none">
            NÃO
          </div>
        </>
      ) : data.type !== "end" ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-primary !border-2 !border-background"
        />
      ) : null}
    </div>
  );
}
