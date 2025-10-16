import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, AlertCircle, AlertOctagon, XCircle, Infinity } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType = 'VALIDO' | 'ATENCAO' | 'CRITICO' | 'URGENTE' | 'VENCIDO' | 'SEM_VENCIMENTO';

interface StatusBadgeProps {
  diasRestantes?: number | null;
  status?: StatusType;
  compact?: boolean;
  className?: string;
}

export function StatusBadge({ diasRestantes, status, compact = false, className }: StatusBadgeProps) {
  // Calcular status baseado em dias restantes se não foi fornecido
  const calculatedStatus = status || calcularStatus(diasRestantes);
  
  const config = {
    VALIDO: {
      label: 'Válido',
      icon: CheckCircle,
      className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400',
    },
    ATENCAO: {
      label: 'Atenção',
      icon: AlertTriangle,
      className: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400',
    },
    CRITICO: {
      label: 'Crítico',
      icon: AlertCircle,
      className: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400',
    },
    URGENTE: {
      label: 'Urgente',
      icon: AlertOctagon,
      className: 'bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/20 dark:text-red-400',
    },
    VENCIDO: {
      label: 'Vencido',
      icon: XCircle,
      className: 'bg-red-900/10 text-red-900 border-red-900/20 dark:bg-red-900/20 dark:text-red-300',
    },
    SEM_VENCIMENTO: {
      label: 'Permanente',
      icon: Infinity,
      className: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400',
    },
  };

  const { label, icon: Icon, className: statusClassName } = config[calculatedStatus];

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "gap-1.5 font-medium",
        statusClassName,
        compact && "text-xs py-0.5 px-2",
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
      {!compact && label}
      {!compact && diasRestantes !== null && diasRestantes !== undefined && (
        <span className="text-xs">
          ({diasRestantes > 0 ? `${diasRestantes}d` : `${Math.abs(diasRestantes)}d atrás`})
        </span>
      )}
    </Badge>
  );
}

function calcularStatus(diasRestantes?: number | null): StatusType {
  if (diasRestantes === null || diasRestantes === undefined) {
    return 'SEM_VENCIMENTO';
  }
  
  if (diasRestantes < 0) return 'VENCIDO';
  if (diasRestantes <= 6) return 'URGENTE';
  if (diasRestantes <= 14) return 'CRITICO';
  if (diasRestantes <= 30) return 'ATENCAO';
  return 'VALIDO';
}
