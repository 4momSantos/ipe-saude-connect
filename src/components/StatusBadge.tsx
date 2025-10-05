import { Badge } from "@/components/ui/badge";

type StatusType = "em_habilitacao" | "habilitado" | "inabilitado" | "em_analise" | "pendente" | "aprovado";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig = {
  em_habilitacao: {
    label: "Em Habilitação",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  habilitado: {
    label: "Habilitado",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  inabilitado: {
    label: "Inabilitado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  em_analise: {
    label: "Em Análise",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  pendente: {
    label: "Pendente",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant="outline" className={`${config.className} ${className} font-medium`}>
      {config.label}
    </Badge>
  );
}
