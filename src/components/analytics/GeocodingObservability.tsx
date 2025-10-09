import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Activity, TrendingUp, Database, RefreshCw, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { EnriquecimentoManager } from "./EnriquecimentoManager";

interface GeoStats {
  total_credenciados: number;
  total_geocoded: number;
  total_missing_geo: number;
  total_max_attempts_reached: number;
  avg_hours_to_geocode: number;
  success_rate_percent: number;
  created_last_24h: number;
  geocoded_last_24h: number;
}

interface CacheStats {
  total_cache_entries: number;
  reused_entries: number;
  total_hits: number;
  avg_hits_per_entry: number;
  cache_reuse_rate_percent: number;
}

interface Alert {
  alert_type: string;
  severity: string;
  message: string;
  count: number | null;
  details: any; // Changed from Record<string, any> to handle Json type
}

export function GeocodingObservability() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<GeoStats | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    loadMonitoringData();
  }, []);

  async function loadMonitoringData() {
    setLoading(true);
    try {
      // Load Stats
      const { data: statsData, error: statsError } = await supabase
        .from('view_credenciados_geo_stats')
        .select('*')
        .single();

      if (statsError) throw statsError;
      setStats(statsData);

      // Load Cache Stats
      const { data: cacheData, error: cacheError } = await supabase
        .from('view_geocode_cache_stats')
        .select('*')
        .single();

      if (cacheError) throw cacheError;
      setCacheStats(cacheData);

      // Check Alerts
      const { data: alertsData, error: alertsError } = await supabase
        .rpc('check_geocoding_alerts');

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

    } catch (error) {
      console.error('[MONITOR] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados de monitoramento');
    } finally {
      setLoading(false);
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'warning';
      default: return 'secondary';
    }
  };

  const getHealthStatus = () => {
    if (!stats) return { status: 'unknown', color: 'gray' };
    
    const successRate = stats.success_rate_percent || 0;
    const missing = stats.total_missing_geo || 0;
    
    if (successRate >= 95 && missing < 10) {
      return { status: 'excellent', color: 'green', label: 'Excelente' };
    } else if (successRate >= 80 && missing < 50) {
      return { status: 'good', color: 'blue', label: 'Bom' };
    } else if (successRate >= 60 && missing < 100) {
      return { status: 'warning', color: 'yellow', label: 'Atenção' };
    } else {
      return { status: 'critical', color: 'red', label: 'Crítico' };
    }
  };

  const health = getHealthStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Observabilidade - Geocodificação</h2>
          <p className="text-muted-foreground">
            Monitoramento em tempo real do sistema de geocodificação
          </p>
        </div>
        <Button onClick={loadMonitoringData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Alertas */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <Alert key={idx} variant={getSeverityColor(alert.severity) as any}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {alert.message}
                <Badge variant={getSeverityColor(alert.severity) as any}>
                  {alert.severity}
                </Badge>
              </AlertTitle>
              <AlertDescription>
                {alert.details.action && (
                  <p className="mt-2 text-sm">
                    <strong>Ação recomendada:</strong> {alert.details.action}
                  </p>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status Geral do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-6xl font-bold text-${health.color}-600`}>
              {stats?.success_rate_percent?.toFixed(1) || 0}%
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de Sucesso</span>
                <Badge variant={health.status === 'critical' ? 'destructive' : 'secondary'}>
                  {health.label}
                </Badge>
              </div>
              <Progress 
                value={stats?.success_rate_percent || 0} 
                className="h-3"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="enriquecimento">Enriquecimento</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Total de Credenciados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total_credenciados || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Geocodificados: {stats?.total_geocoded || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {stats?.total_missing_geo || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Máx. tentativas: {stats?.total_max_attempts_reached || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Tempo Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {stats?.avg_hours_to_geocode?.toFixed(1) || 0}h
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Para geocodificar
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Últimas 24 Horas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Criados</p>
                  <p className="text-2xl font-bold">{stats?.created_last_24h || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Geocodificados</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.geocoded_last_24h || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Entradas no Cache
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {cacheStats?.total_cache_entries || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Reusadas: {cacheStats?.reused_entries || 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Taxa de Reuso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {cacheStats?.cache_reuse_rate_percent?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de hits: {cacheStats?.total_hits || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Estatísticas de Uso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Média de hits por entrada</span>
                <span className="font-bold">
                  {cacheStats?.avg_hits_per_entry?.toFixed(2) || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa de reuso</span>
                <Badge variant="secondary">
                  {cacheStats?.cache_reuse_rate_percent?.toFixed(1) || 0}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance de Geocodificação</CardTitle>
              <CardDescription>
                Métricas de tempo e eficiência
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Taxa de Sucesso</span>
                  <span className="text-sm font-bold">
                    {stats?.success_rate_percent?.toFixed(1) || 0}%
                  </span>
                </div>
                <Progress value={stats?.success_rate_percent || 0} />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  <p className="text-xl font-bold">
                    {stats?.avg_hours_to_geocode?.toFixed(1) || 0}h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processados 24h</p>
                  <p className="text-xl font-bold text-green-600">
                    {stats?.geocoded_last_24h || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enriquecimento" className="space-y-4">
          <EnriquecimentoManager />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sobre o Enriquecimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                O enriquecimento usa <strong>OpenStreetMap Nominatim</strong> para obter dados 
                adicionais de endereço como bairro, CEP completo e nome completo da cidade.
              </p>
              <div className="space-y-2">
                <p className="font-medium text-foreground">✅ Dados enriquecidos:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Bairro (suburb/neighbourhood)</li>
                  <li>Cidade completa</li>
                  <li>Estado</li>
                  <li>CEP (quando disponível)</li>
                  <li>País</li>
                </ul>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs">
                  <strong>Rate Limit:</strong> 1 requisição/segundo (respeitado automaticamente)
                </p>
                <p className="text-xs">
                  <strong>Cache:</strong> Resultados são cacheados para evitar requisições duplicadas
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
