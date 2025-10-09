import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, PlayCircle, StopCircle } from "lucide-react";

export const BatchGeocoding = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [successful, setSuccessful] = useState(0);
  const [failed, setFailed] = useState(0);
  const [shouldStop, setShouldStop] = useState(false);

  const startBatchGeocoding = async () => {
    setIsRunning(true);
    setShouldStop(false);
    setProcessed(0);
    setSuccessful(0);
    setFailed(0);

    try {
      // Buscar credenciados sem coordenadas
      const { data: credenciados, error } = await supabase
        .from('credenciados')
        .select('id, nome, endereco, cidade, estado, cep')
        .is('latitude', null)
        .eq('status', 'Ativo')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!credenciados || credenciados.length === 0) {
        toast.info('Todos os credenciados já estão geocodificados! 🎉');
        setIsRunning(false);
        return;
      }

      setTotal(credenciados.length);
      toast.info(`Iniciando geocodificação de ${credenciados.length} credenciados...`);

      let successCount = 0;
      let failCount = 0;

      // Processar em lote com delay para não sobrecarregar API
      for (let i = 0; i < credenciados.length; i++) {
        if (shouldStop) {
          toast.warning('Processo interrompido pelo usuário');
          break;
        }

        const credenciado = credenciados[i];

        try {
          console.log(`[BATCH] Geocodificando ${i + 1}/${credenciados.length}: ${credenciado.nome}`);

          const { data, error: geocodeError } = await supabase.functions.invoke('geocodificar-credenciado', {
            body: {
              credenciado_id: credenciado.id
            }
          });

          if (geocodeError) throw geocodeError;

          if (data?.success) {
            successCount++;
            setSuccessful(successCount);
          } else {
            failCount++;
            setFailed(failCount);
            console.error(`[BATCH] Falha em ${credenciado.nome}:`, data?.error);
          }
        } catch (err) {
          console.error(`[BATCH] Erro em ${credenciado.nome}:`, err);
          failCount++;
          setFailed(failCount);
        }

        setProcessed(i + 1);
        setProgress(((i + 1) / credenciados.length) * 100);

        // Delay de 1 segundo entre requisições para respeitar rate limit do Nominatim
        if (i < credenciados.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success(
        `✅ Geocodificação concluída!\n` +
        `Sucesso: ${successCount}\n` +
        `Falhas: ${failCount}`
      );
    } catch (error) {
      console.error('[BATCH] Erro:', error);
      toast.error('Erro ao processar geocodificação em lote');
    } finally {
      setIsRunning(false);
      setShouldStop(false);
    }
  };

  const stopBatchGeocoding = () => {
    setShouldStop(true);
    toast.info('Parando após o item atual...');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Geocodificação em Lote
        </CardTitle>
        <CardDescription>
          Processa todos os credenciados sem coordenadas geográficas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRunning && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progresso: {processed}/{total}</span>
              <span className="text-green-600">✓ {successful}</span>
              {failed > 0 && <span className="text-red-600">✗ {failed}</span>}
            </div>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={startBatchGeocoding}
            disabled={isRunning}
            className="gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Iniciar Geocodificação
          </Button>

          {isRunning && (
            <Button
              onClick={stopBatchGeocoding}
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
          <p>• Usa cache para endereços já processados</p>
          <p>• Pode ser interrompido a qualquer momento</p>
        </div>
      </CardContent>
    </Card>
  );
};
