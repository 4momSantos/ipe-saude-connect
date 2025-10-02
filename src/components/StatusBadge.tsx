import { Badge } from "@/components/ui/badge";

type StatusType = "em_habilitacao" | "habilitado" | "inabilitado" | "em_analise" | "pendente" | "aprovado";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig = {
  em_habilitacao: {
    label: "Em Habilitação",
    className: "bg-[hsl(var(--purple-workflow)_/_0.2)] text-[hsl(var(--purple-workflow))] border-[hsl(var(--purple-workflow)_/_0.3)]",
  },
  habilitado: {
    label: "Habilitado",
    className: "bg-[hsl(var(--green-approved)_/_0.2)] text-[hsl(var(--green-approved))] border-[hsl(var(--green-approved)_/_0.3)]",
  },
  inabilitado: {
    label: "Inabilitado",
    className: "bg-[hsl(var(--red-rejected)_/_0.2)] text-[hsl(var(--red-rejected))] border-[hsl(var(--red-rejected)_/_0.3)]",
  },
  em_analise: {
    label: "Em Análise",
    className: "bg-[hsl(var(--blue-primary)_/_0.2)] text-[hsl(var(--blue-primary))] border-[hsl(var(--blue-primary)_/_0.3)]",
  },
  pendente: {
    label: "Pendente",
    className: "bg-[hsl(var(--orange-warning)_/_0.2)] text-[hsl(var(--orange-warning))] border-[hsl(var(--orange-warning)_/_0.3)]",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-[hsl(var(--green-approved)_/_0.2)] text-[hsl(var(--green-approved))] border-[hsl(var(--green-approved)_/_0.3)]",
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
