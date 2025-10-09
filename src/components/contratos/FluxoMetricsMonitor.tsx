import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFluxoMetrics } from "@/hooks/useFluxoMetrics";
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  FileText, 
  MapPin, 
  TrendingUp, 
  Users, 
  AlertTriangle 
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function FluxoMetricsMonitor() {
  const { data: metrics, isLoading, error } = useFluxoMetrics();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao Carregar Métricas</AlertTitle>
        <AlertDescription>
          Não foi possível carregar as métricas do sistema. Tente novamente mais tarde.
        </AlertDescription>
      </Alert>
    );
  }

  // Alertas baseados nas métricas
  const alerts = [];
  if (metrics) {
    if (metrics.taxaSucesso < 90) {
      alerts.push({
        severity: "error" as const,
        title: "Taxa de Sucesso Baixa",
        message: `Taxa de sucesso está em ${metrics.taxaSucesso.toFixed(1)}% (meta: ≥90%)`,
      });
    }
    if (metrics.latenciaMedia > 10) {
      alerts.push({
        severity: "error" as const,
        title: "Latência Alta",
        message: `Latência média está em ${metrics.latenciaMedia.toFixed(1)} min (meta: <3min)`,
      });
    }
    if (metrics.taxaGeocoding < 80) {
      alerts.push({
        severity: "warning" as const,
        title: "Taxa de Geocodificação Baixa",
        message: `Taxa de geocodificação está em ${metrics.taxaGeocoding.toFixed(1)}% (meta: ≥90%)`,
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Monitor do Fluxo Programático
        </h2>
        <p className="text-muted-foreground">
          Métricas em tempo real do processo de credenciamento
        </p>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <Alert
              key={index}
              variant={alert.severity === "error" ? "destructive" : "default"}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription>{alert.message}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Editais Ativos
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.editaisAtivos || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.editaisProgramaticos || 0} com fluxo programático
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Sucesso
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.taxaSucesso.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.inscricoesProcessadas24h || 0} inscrições nas últimas 24h
            </p>
            {metrics && metrics.taxaSucesso >= 95 && (
              <Badge className="mt-2" variant="default">
                Dentro da meta
              </Badge>
            )}
            {metrics && metrics.taxaSucesso < 90 && (
              <Badge className="mt-2" variant="destructive">
                Abaixo da meta
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Latência Média
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.latenciaMedia.toFixed(1) || 0} min
            </div>
            <p className="text-xs text-muted-foreground">
              Inscrição → Credenciado
            </p>
            {metrics && metrics.latenciaMedia < 3 && (
              <Badge className="mt-2" variant="default">
                Dentro da meta
              </Badge>
            )}
            {metrics && metrics.latenciaMedia > 10 && (
              <Badge className="mt-2" variant="destructive">
                Acima do threshold
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Geocoding
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.taxaGeocoding.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Credenciados geocodificados
            </p>
            {metrics && metrics.taxaGeocoding >= 90 && (
              <Badge className="mt-2" variant="default">
                Dentro da meta
              </Badge>
            )}
            {metrics && metrics.taxaGeocoding < 80 && (
              <Badge className="mt-2" variant="destructive">
                Abaixo do threshold
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Métricas Secundárias */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Contratos Assinados
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.contratosAssinados24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Credenciados Ativados
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.credenciadosAtivados24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Certificados Emitidos
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.certificadosEmitidos24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimas 24 horas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Informações sobre KPIs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            KPIs e Thresholds
          </CardTitle>
          <CardDescription>
            Valores de referência para monitoramento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Métricas Críticas (Go/No-Go)</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Taxa de Sucesso: ≥ 95% (rollback se &lt; 90%)</li>
                  <li>• Latência Média: &lt; 3 min (rollback se &gt; 10 min)</li>
                  <li>• Taxa de Geocoding: ≥ 90% (rollback se &lt; 80%)</li>
                  <li>• Erro Rate: &lt; 1% (rollback se &gt; 5%)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Métricas de Observação</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Contratos assinados por dia</li>
                  <li>• Credenciados ativados por dia</li>
                  <li>• Certificados emitidos por dia</li>
                  <li>• Taxa de retry de geocoding</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
