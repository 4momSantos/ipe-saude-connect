import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type ValidationStatus = "valid" | "invalid" | "pending" | "warning" | "processing" | "uploading";

interface ValidationBadgeProps {
  status: ValidationStatus;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

const statusConfig = {
  valid: {
    label: "Válido",
    icon: CheckCircle2,
    className: "bg-[hsl(var(--green-approved)_/_0.2)] text-[hsl(var(--green-approved))] border-[hsl(var(--green-approved)_/_0.3)]",
  },
  invalid: {
    label: "Inválido",
    icon: XCircle,
    className: "bg-[hsl(var(--red-rejected)_/_0.2)] text-[hsl(var(--red-rejected))] border-[hsl(var(--red-rejected)_/_0.3)]",
  },
  pending: {
    label: "Pendente",
    icon: AlertCircle,
    className: "bg-[hsl(var(--orange-warning)_/_0.2)] text-[hsl(var(--orange-warning))] border-[hsl(var(--orange-warning)_/_0.3)]",
  },
  warning: {
    label: "Atenção",
    icon: AlertCircle,
    className: "bg-[hsl(var(--orange-warning)_/_0.2)] text-[hsl(var(--orange-warning))] border-[hsl(var(--orange-warning)_/_0.3)]",
  },
  processing: {
    label: "Processando",
    icon: Clock,
    className: "bg-[hsl(var(--blue-primary)_/_0.2)] text-[hsl(var(--blue-primary))] border-[hsl(var(--blue-primary)_/_0.3)]",
  },
  uploading: {
    label: "Enviando",
    icon: Clock,
    className: "bg-[hsl(var(--blue-primary)_/_0.2)] text-[hsl(var(--blue-primary))] border-[hsl(var(--blue-primary)_/_0.3)]",
  },
};

export function ValidationBadge({ 
  status, 
  label, 
  className = "",
  showIcon = true 
}: ValidationBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium transition-all duration-300",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {label || config.label}
    </Badge>
  );
}
