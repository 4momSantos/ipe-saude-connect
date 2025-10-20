import { FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SolicitacoesIndicatorProps {
  pendingCount: number;
  className?: string;
}

/**
 * Indicador visual de solicitações pendentes
 */
export function SolicitacoesIndicator({ pendingCount, className }: SolicitacoesIndicatorProps) {
  if (pendingCount === 0) {
    return (
      <div className={cn("flex items-center gap-1.5 text-muted-foreground", className)}>
        <FileEdit className="h-4 w-4" />
        <span className="text-xs">Nenhuma</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-1.5 text-amber-500", className)}>
      <FileEdit className="h-4 w-4 animate-pulse" />
      <Badge variant="default" className="h-5 px-1.5 text-xs bg-amber-500 hover:bg-amber-600">
        {pendingCount > 99 ? "99+" : pendingCount}
      </Badge>
      <span className="text-xs font-medium">
        {pendingCount === 1 ? "1 pendente" : `${pendingCount} pendentes`}
      </span>
    </div>
  );
}
