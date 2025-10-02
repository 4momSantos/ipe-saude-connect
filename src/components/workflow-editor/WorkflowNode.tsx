import { Handle, Position } from "@xyflow/react";
import { 
  FileText, 
  CheckCircle, 
  Mail, 
  GitBranch, 
  Play, 
  StopCircle,
  LucideIcon 
} from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow-editor";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  FileText,
  CheckCircle,
  Mail,
  GitBranch,
  Play,
  StopCircle,
};

interface WorkflowNodeProps {
  data: WorkflowNodeData;
  selected: boolean;
}

export function WorkflowNode({ data, selected }: WorkflowNodeProps) {
  const Icon = iconMap[data.icon] || FileText;

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-card shadow-lg transition-all duration-200",
        "min-w-[180px] hover:shadow-xl",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{ borderColor: data.color }}
    >
      {data.type !== "start" && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-primary"
        />
      )}
      
      <div className="flex items-center gap-3">
        <div
          className="p-2 rounded-md"
          style={{ backgroundColor: `${data.color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color: data.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{data.label}</div>
          <div className="text-xs text-muted-foreground capitalize">
            {data.type}
          </div>
        </div>
      </div>

      {data.formFields && data.formFields.length > 0 && (
        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
          {data.formFields.length} campo{data.formFields.length !== 1 ? "s" : ""}
        </div>
      )}

      {data.type !== "end" && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-primary"
        />
      )}
    </div>
  );
}
