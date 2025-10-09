import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, PlayCircle, StopCircle, Zap, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BackfillResult {
  processed: number;
  success: number;
  failed: number;
  skipped: number;
  duration: number;
  errors?: Array<{ id: string; nome: string; error: string }>;
}

interface GeocodingStats {
  total: number;
  geocoded: number;
  pending: number;
  percentage: number;
}

const useGeocodingStats = () => {
  const [stats, setStats] = useState<GeocodingStats>({
    total: 0,
    geocoded: 0,
    pending: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: total } = await supabase
        .from('credenciados')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ativo');

      const { count: geocoded } = await supabase
        .from('credenciados')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ativo')
        .not('latitude', 'is', null);

      const totalCount = total || 0;
      const geocodedCount = geocoded || 0;
      const pending = totalCount - geocodedCount;
      const percentage = totalCount > 0 ? (geocodedCount / totalCount) * 100 : 0;

      setStats({ total: totalCount, geocoded: geocodedCount, pending, percentage });
    } catch (error) {
      console.error('[STATS] Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, fetchStats };
};

export const GeocodingManager = () => {
  const { stats, loading: statsLoading, fetchStats } = useGeocodingStats();

  // Estado do Modo Interativo
  const [isRunningInteractive, setIsRunningInteractive] = useState(false);
  const [progressInteractive, setProgressInteractive] = useState(0);
  const [totalInteractive, setTotalInteractive] = useState(0);
  const [processedInteractive, setProcessedInteractive] = useState(0);
  const [successfulInteractive, setSuccessfulInteractive] = useState(0);
  const [failedInteractive, setFailedInteractive] = useState(0);
  const [shouldStop, setShouldStop] = useState(false);

  // Estado do Modo Lote
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [result, setResult] = useState<BackfillResult | null>(null);

  // Carregar stats ao montar
  useState(() => {
    fetchStats();
  });

  // Modo Interativo - Frontend-driven
  const startInteractiveGeocoding = async () => {
    setIsRunningInteractive(true);
    setShouldStop(false);
    setProcessedInteractive(0);
    setSuccessfulInteractive(0);
    setFailedInteractive(0);

    try {
      const { data: credenciados, error } = await supabase
        .from('credenciados')
        .select('id, nome, endereco, cidade, estado, cep')
        .is('latitude', null)
        .eq('status', 'Ativo')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!credenciados || credenciados.length === 0) {
        toast.info('Todos os credenciados já estão geocodificados! 🎉');
        setIsRunningInteractive(false);
        return;
      }

      setTotalInteractive(credenciados.length);
      toast.info(`Iniciando geocodificação de ${credenciados.length} credenciados...`);

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < credenciados.length; i++) {
        if (shouldStop) {
          toast.warning('Processo interrompido pelo usuário');
          break;
        }

        const credenciado = credenciados[i];

        try {
          console.log(`[INTERATIVO] Geocodificando ${i + 1}/${credenciados.length}: ${credenciado.nome}`);

          const { data, error: geocodeError } = await supabase.functions.invoke('geocodificar-credenciado', {
            body: { credenciado_id: credenciado.id }
          });

          if (geocodeError) throw geocodeError;

          if (data?.success) {
            successCount++;
            setSuccessfulInteractive(successCount);
          } else {
            failCount++;
            setFailedInteractive(failCount);
            console.error(`[INTERATIVO] Falha em ${credenciado.nome}:`, data?.error);
          }
        } catch (err) {
          console.error(`[INTERATIVO] Erro em ${credenciado.nome}:`, err);
          failCount++;
          setFailedInteractive(failCount);
        }

        setProcessedInteractive(i + 1);
        setProgressInteractive(((i + 1) / credenciados.length) * 100);

        if (i < credenciados.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success(
        `✅ Geocodificação concluída!\nSucesso: ${successCount}\nFalhas: ${failCount}`
      );
      
      await fetchStats();
    } catch (error) {
      console.error('[INTERATIVO] Erro:', error);
      toast.error('Erro ao processar geocodificação interativa');
    } finally {
      setIsRunningInteractive(false);
      setShouldStop(false);
    }
  };

  const stopInteractiveGeocoding = () => {
    setShouldStop(true);
    toast.info('Parando após o item atual...');
  };

  // Modo Lote - Backend-driven
  const runBatchGeocoding = async () => {
    setIsRunningBatch(true);
    setResult(null);

    try {
      console.log('[BATCH] Iniciando backfill de geocodificação...');
      
      const { data, error } = await supabase.functions.invoke('backfill-geocoding', {
        body: {
          batch_size: batchSize,
          max_attempts: 3
        }
      });

      if (error) throw error;

      console.log('[BATCH] Resultado:', data);
      setResult(data);

      if (data.success > 0) {
        toast.success(
          `✅ Backfill concluído!\n` +
          `Processados: ${data.processed}\n` +
          `Sucesso: ${data.success}\n` +
          `Falhas: ${data.failed}`
        );
      } else if (data.processed === 0) {
        toast.info('Nenhum credenciado pendente de geocodificação');
      } else {
        toast.warning(
          `⚠️ Backfill concluído com falhas\n` +
          `Sucesso: ${data.success}\n` +
          `Falhas: ${data.failed}`
        );
      }

      await fetchStats();
    } catch (error) {
      console.error('[BATCH] Erro:', error);
      toast.error('Erro ao executar backfill de geocodificação');
    } finally {
      setIsRunningBatch(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Geocodificação de Credenciados
        </CardTitle>
        <CardDescription>
          Processa endereços para obter coordenadas geográficas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estatísticas Globais */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{statsLoading ? '...' : stats.total}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Geocodificados</p>
            <p className="text-2xl font-bold text-green-600">{statsLoading ? '...' : stats.geocoded}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-orange-600">{statsLoading ? '...' : stats.pending}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cobertura</p>
            <p className="text-2xl font-bold">{statsLoading ? '...' : `${stats.percentage.toFixed(1)}%`}</p>
          </div>
        </div>

        {/* Tabs de Modo */}
        <Tabs defaultValue="interactive" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="interactive" className="gap-2">
              <PlayCircle className="h-4 w-4" />
              Modo Interativo
            </TabsTrigger>
            <TabsTrigger value="batch" className="gap-2">
              <Zap className="h-4 w-4" />
              Modo Lote (Avançado)
            </TabsTrigger>
          </TabsList>

          {/* Tab: Modo Interativo */}
          <TabsContent value="interactive" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ideal para até 100 registros. Progresso em tempo real, pausável.
              </AlertDescription>
            </Alert>

            {isRunningInteractive && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso: {processedInteractive}/{totalInteractive}</span>
                  <span className="text-green-600">✓ {successfulInteractive}</span>
                  {failedInteractive > 0 && <span className="text-red-600">✗ {failedInteractive}</span>}
                </div>
                <Progress value={progressInteractive} />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={startInteractiveGeocoding}
                disabled={isRunningInteractive}
                className="gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Iniciar Geocodificação
              </Button>

              {isRunningInteractive && (
                <Button
                  onClick={stopInteractiveGeocoding}
                  variant="destructive"
                  disabled={shouldStop}
                  className="gap-2"
                >
                  <StopCircle className="h-4 w-4" />
                  Parar
                </Button>
              )}
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Processa 1 endereço por segundo (rate limit do Nominatim)</p>
              <p>• Feedback visual em tempo real</p>
              <p>• Pode ser interrompido a qualquer momento</p>
            </div>
          </TabsContent>

          {/* Tab: Modo Lote */}
          <TabsContent value="batch" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Ideal para mais de 100 registros. Processamento em lote via backend com retry automático.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="batchSize">Tamanho do Lote</Label>
              <Input
                id="batchSize"
                type="number"
                min={1}
                max={100}
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
                disabled={isRunningBatch}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Quantidade de credenciados processados por execução (1-100)
              </p>
            </div>

            <Button
              onClick={runBatchGeocoding}
              disabled={isRunningBatch}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {isRunningBatch ? 'Processando...' : 'Executar Backfill'}
            </Button>

            {result && (
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Processados</p>
                    <p className="text-xl font-bold">{result.processed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sucesso</p>
                    <p className="text-xl font-bold text-green-600">{result.success}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Falhas</p>
                    <p className="text-xl font-bold text-red-600">{result.failed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Duração</p>
                    <p className="text-xl font-bold">{formatDuration(result.duration)}</p>
                  </div>
                </div>

                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">
                      Falhas ({result.errors.length}):
                    </p>
                    <div className="space-y-1 text-xs">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <div key={i} className="flex justify-between p-2 bg-destructive/10 rounded">
                          <span className="font-medium">{err.nome}</span>
                          <span className="text-muted-foreground">{err.error}</span>
                        </div>
                      ))}
                      {result.errors.length > 5 && (
                        <p className="text-muted-foreground">
                          ... e mais {result.errors.length - 5} falhas
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Processamento em lote via Edge Function</p>
              <p>• Retry automático para falhas temporárias</p>
              <p>• Escalável para grandes volumes</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
