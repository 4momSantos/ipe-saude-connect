import { Badge } from "@/components/ui/badge";

type StatusType = "em_habilitacao" | "habilitado" | "inabilitado" | "em_analise" | "aguardando_analise" | "pendente" | "aprovado" | "pendente_workflow" | "rejeitado" | "validado";

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
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  em_analise: {
    label: "Em Análise",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  aguardando_analise: {
    label: "Aguardando Análise",
    className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  pendente: {
    label: "Pendente",
    className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  pendente_workflow: {
    label: "Aguardando Processamento",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  aprovado: {
    label: "Aprovado",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  rejeitado: {
    label: "Rejeitado",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  validado: {
    label: "Validado",
    className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  },
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  // Fallback caso status não exista
  if (!config) {
    console.warn(`Status não mapeado: ${status}`);
    return (
      <Badge variant="outline" className={`bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 font-medium ${className}`}>
        {status}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className={`${config.className} ${className} font-medium`}>
      {config.label}
    </Badge>
  );
}
