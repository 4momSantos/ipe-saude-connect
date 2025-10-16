import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CheckCircle, AlertTriangle, AlertCircle, AlertOctagon, XCircle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardKPIs() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-prazos-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_prazos_completos')
        .select('dias_para_vencer, nivel_alerta')
        .eq('entidade_tipo', 'documento_credenciado');

      if (error) throw error;

      const validos = data?.filter(d => d.dias_para_vencer > 30).length || 0;
      const atencao = data?.filter(d => d.dias_para_vencer >= 15 && d.dias_para_vencer <= 30).length || 0;
      const criticos = data?.filter(d => d.dias_para_vencer >= 7 && d.dias_para_vencer < 15).length || 0;
      const urgentes = data?.filter(d => d.dias_para_vencer >= 1 && d.dias_para_vencer < 7).length || 0;
      const vencidos = data?.filter(d => d.dias_para_vencer < 0).length || 0;
      const total = data?.length || 0;

      const taxaConformidade = total > 0 
        ? Math.round(((validos + atencao) / total) * 100) 
        : 0;

      return {
        validos,
        atencao,
        criticos,
        urgentes,
        vencidos,
        total,
        taxaConformidade,
        acaoNecessaria: criticos + urgentes + vencidos,
      };
    },
    refetchInterval: 60000, // Atualizar a cada 1 minuto
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Válidos',
      value: stats?.validos || 0,
      percentage: stats?.total ? Math.round((stats.validos / stats.total) * 100) : 0,
      icon: CheckCircle,
      className: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Atenção',
      value: stats?.atencao || 0,
      percentage: stats?.total ? Math.round((stats.atencao / stats.total) * 100) : 0,
      icon: AlertTriangle,
      className: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Crítico',
      value: stats?.criticos || 0,
      percentage: stats?.total ? Math.round((stats.criticos / stats.total) * 100) : 0,
      icon: AlertCircle,
      className: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      label: 'Urgente',
      value: stats?.urgentes || 0,
      percentage: stats?.total ? Math.round((stats.urgentes / stats.total) * 100) : 0,
      icon: AlertOctagon,
      className: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Vencidos',
      value: stats?.vencidos || 0,
      percentage: stats?.total ? Math.round((stats.vencidos / stats.total) * 100) : 0,
      icon: XCircle,
      className: 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-900',
      iconColor: 'text-red-800 dark:text-red-300',
    },
    {
      label: 'Conformidade',
      value: `${stats?.taxaConformidade || 0}%`,
      percentage: stats?.taxaConformidade || 0,
      icon: TrendingUp,
      className: 'bg-primary/5 dark:bg-primary/10 border-primary/20',
      iconColor: 'text-primary',
      isPercentage: true,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={`p-4 ${kpi.className}`}>
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              {!kpi.isPercentage && (
                <span className="text-xs text-muted-foreground">
                  {kpi.percentage}%
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold tracking-tight">
                {kpi.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {kpi.label}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {stats && stats.acaoNecessaria > 0 && (
        <Card className="p-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                ⚠️ Ação Necessária: {stats.acaoNecessaria} documentos
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {stats.criticos > 0 && `${stats.criticos} crítico(s), `}
                {stats.urgentes > 0 && `${stats.urgentes} urgente(s), `}
                {stats.vencidos > 0 && `${stats.vencidos} vencido(s)`}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
