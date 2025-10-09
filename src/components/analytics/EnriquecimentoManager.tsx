import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEnriquecerEndereco } from "@/hooks/useEnriquecerEndereco";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Sparkles, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function EnriquecimentoManager() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<{
    total: number;
    success: number;
    failed: number;
    cached: number;
  }>({ total: 0, success: 0, failed: 0, cached: 0 });

  const { enriquecer } = useEnriquecerEndereco();

  const processarEmLote = async (limit = 50) => {
    setIsProcessing(true);
    setProgress(0);
    setStats({ total: 0, success: 0, failed: 0, cached: 0 });

    try {
      // Buscar credenciados para processar
      const { data: credenciados, error } = await supabase
        .from('credenciados')
        .select('id, nome, latitude, longitude')
        .not('latitude', 'is', null)
        .eq('status', 'Ativo')
        .limit(limit);

      if (error) throw error;

      if (!credenciados || credenciados.length === 0) {
        toast.info("Nenhum credenciado precisa de enriquecimento");
        return;
      }

      setStats(prev => ({ ...prev, total: credenciados.length }));

      // Processar cada um
      for (let i = 0; i < credenciados.length; i++) {
        try {
          const result = await enriquecer({ credenciadoId: credenciados[i].id });
          
          setStats(prev => ({
            ...prev,
            success: prev.success + 1,
            cached: prev.cached + (result.cached ? 1 : 0),
          }));
        } catch (error) {
          setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
        }

        setProgress(((i + 1) / credenciados.length) * 100);

        // Rate limit: 1.1s entre requisições
        if (i < credenciados.length - 1) {
          await new Promise(r => setTimeout(r, 1100));
        }
      }

      toast.success("Processamento concluído!", {
        description: `${stats.success} enriquecidos, ${stats.failed} falhas`,
      });

    } catch (error) {
      console.error("Erro no processamento em lote:", error);
      toast.error("Erro no processamento em lote");
    } finally {
      setIsProcessing(false);
    }
  };

  const calcularTaxaSucesso = () => {
    if (stats.total === 0) return 0;
    return Math.round((stats.success / stats.total) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Enriquecimento de Endereços
            </CardTitle>
            <CardDescription>
              Enriquece dados de endereço via OpenStreetMap Nominatim
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            OSM
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Estatísticas em tempo real */}
        {stats.total > 0 && (
          <div className="space-y-3">
            <Progress value={progress} className="h-2" />
            
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                  {stats.success}
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="text-xs text-muted-foreground">Sucesso</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.cached}</div>
                <div className="text-xs text-muted-foreground">Cache</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                  {stats.failed}
                  {stats.failed > 0 && <AlertCircle className="h-4 w-4" />}
                </div>
                <div className="text-xs text-muted-foreground">Falhas</div>
              </div>
            </div>

            <div className="text-center p-2 bg-primary/10 rounded-lg">
              <div className="text-sm font-medium">
                Taxa de Sucesso: {calcularTaxaSucesso()}%
              </div>
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex gap-2">
          <Button
            onClick={() => processarEmLote(50)}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Enriquecer 50
              </>
            )}
          </Button>

          <Button
            onClick={() => processarEmLote(100)}
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            Enriquecer 100
          </Button>
        </div>

        {/* Informações */}
        <div className="space-y-2 pt-4 border-t">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>OpenStreetMap Nominatim</strong> - Rate limit: 1 req/s (automático)
            </div>
          </div>
          
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-600" />
            <div>
              Enriquece: bairro, cidade, estado, CEP, país
            </div>
          </div>
          
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-4 w-4 mt-0.5 shrink-0 text-blue-600" />
            <div>
              Cache inteligente: evita requisições duplicadas
            </div>
          </div>
        </div>

        {/* Estimativa de tempo */}
        {isProcessing && (
          <div className="text-center text-sm text-muted-foreground">
            Tempo estimado: ~{Math.ceil((stats.total * 1.1) / 60)} minutos
          </div>
        )}
      </CardContent>
    </Card>
  );
}
