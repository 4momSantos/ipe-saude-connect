import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BackfillResult {
  processed: number;
  success: number;
  failed: Array<{ id: string; nome: string; reason: string }>;
  skipped: number;
  duration_ms: number;
  message?: string;
  error?: string;
}

export function BackfillGeocoding() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [batchSize, setBatchSize] = useState(50);
  const [result, setResult] = useState<BackfillResult | null>(null);

  const runBackfill = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('backfill-geocoding', {
        body: {
          batch_size: batchSize,
          max_attempts: 5,
        },
      });

      if (error) throw error;

      setResult(data);

      if (data.success > 0) {
        toast({
          title: "Backfill concluído",
          description: `${data.success} de ${data.processed} credenciados geocodificados com sucesso.`,
        });
      } else if (data.processed === 0) {
        toast({
          title: "Nenhum pendente",
          description: "Todos os credenciados já foram geocodificados.",
        });
      }
    } catch (error) {
      console.error('Erro no backfill:', error);
      toast({
        title: "Erro no backfill",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
      setResult({
        processed: 0,
        success: 0,
        failed: [],
        skipped: 0,
        duration_ms: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${seconds}s`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Backfill de Geocodificação
        </CardTitle>
        <CardDescription>
          Processa em lote credenciados que ainda não possuem coordenadas geográficas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="batch-size">Tamanho do Lote</Label>
          <Input
            id="batch-size"
            type="number"
            min={1}
            max={100}
            value={batchSize}
            onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
            disabled={isRunning}
          />
          <p className="text-sm text-muted-foreground">
            Recomendado: 50 (aprox. 1 minuto de processamento)
          </p>
        </div>

        <Button
          onClick={runBackfill}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Iniciar Backfill
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-semibold text-sm">Resultado:</h4>
            
            {result.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Processados</p>
                    <p className="text-2xl font-bold">{result.processed}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Sucesso</p>
                    <p className="text-2xl font-bold text-green-600">{result.success}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Falhas</p>
                    <p className="text-2xl font-bold text-red-600">{result.failed.length}</p>
                  </div>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">Duração</p>
                    <p className="text-2xl font-bold">{formatDuration(result.duration_ms)}</p>
                  </div>
                </div>

                {result.success > 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      {result.success} credenciados geocodificados com sucesso!
                    </AlertDescription>
                  </Alert>
                )}

                {result.failed.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <p className="font-semibold mb-2">Falhas ({result.failed.length}):</p>
                      <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                        {result.failed.slice(0, 5).map((item) => (
                          <li key={item.id}>
                            <strong>{item.nome}</strong>: {item.reason}
                          </li>
                        ))}
                        {result.failed.length > 5 && (
                          <li className="italic">
                            ... e mais {result.failed.length - 5} falhas
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {result.processed === 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {result.message || 'Nenhum credenciado pendente de geocodificação'}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground pt-4 border-t space-y-1">
          <p><strong>Nota:</strong> Respeitamos rate limits de API (1.1s entre chamadas)</p>
          <p><strong>Tentativas:</strong> Máximo 5 tentativas por endereço</p>
          <p><strong>Agendamento:</strong> Configure cron para execução diária automática</p>
        </div>
      </CardContent>
    </Card>
  );
}
