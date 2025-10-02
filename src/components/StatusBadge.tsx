import { Badge } from "@/components/ui/badge";

type StatusType = "em_habilitacao" | "habilitado" | "inabilitado" | "em_analise" | "pendente" | "aprovado";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig = {
  em_habilitacao: {
    label: "Em Habilitação",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  habilitado: {
    label: "Habilitado",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  inabilitado: {
    label: "Inabilitado",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
  em_analise: {
    label: "Em Análise",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  pendente: {
    label: "Pendente",
    className: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
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
