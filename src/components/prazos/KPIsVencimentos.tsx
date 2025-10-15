// FASE 1: Componente de KPIs de Vencimentos
import { Card } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { TotalizadoresPrazos } from "@/hooks/usePrazosVencimentos";

interface KPIsVencimentosProps {
  totalizadores: TotalizadoresPrazos;
  isLoading?: boolean;
}

export const KPIsVencimentos = ({ totalizadores, isLoading }: KPIsVencimentosProps) => {
  const kpis = [
    {
      title: "Vencidos",
      count: totalizadores.vencidos,
      icon: AlertCircle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/30",
      borderColor: "border-red-200 dark:border-red-800"
    },
    {
      title: "Vencendo (7 dias)",
      count: totalizadores.vencendo7dias,
      icon: AlertTriangle,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/30",
      borderColor: "border-orange-200 dark:border-orange-800"
    },
    {
      title: "Vencendo (30 dias)",
      count: totalizadores.vencendo30dias,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
      borderColor: "border-yellow-200 dark:border-yellow-800"
    },
    {
      title: "Válidos",
      count: totalizadores.validos,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/30",
      borderColor: "border-green-200 dark:border-green-800"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card
            key={kpi.title}
            className={`p-6 border-2 ${kpi.borderColor} ${kpi.bgColor} transition-all hover:shadow-lg`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <p className={`text-3xl font-bold mt-2 ${kpi.color}`}>
                  {isLoading ? "..." : kpi.count}
                </p>
              </div>
              <Icon className={`h-8 w-8 ${kpi.color}`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
};