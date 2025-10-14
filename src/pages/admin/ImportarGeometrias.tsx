import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportResult {
  cidade: string;
  total_bairros: number;
  total_zonas: number;
  resultados: Array<{
    zona: string;
    status: string;
    bairros?: number;
    bairros_nomes?: string[];
    erro?: string;
  }>;
}

export function ImportarGeometrias() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, ImportResult>>({});

  const importar = async (cidadeNome: string) => {
    setLoading(prev => ({ ...prev, [cidadeNome]: true }));
    
    try {
      console.log(`[IMPORT] Iniciando importação de bairros reais para ${cidadeNome}`);
      
      const { data, error } = await supabase.functions.invoke('importar-bairros-poa', {
        body: { cidade_nome: cidadeNome }
      });
      
      if (error) {
        console.error('[IMPORT] Erro:', error);
        throw error;
      }
      
      console.log('[IMPORT] Resultado:', data);
      
      setResults(prev => ({ ...prev, [cidadeNome]: data }));
      
      toast.success(`Bairros de ${cidadeNome} importados!`, {
        description: `${data.total_bairros} bairros processados em ${data.total_zonas} zonas`
      });
      
    } catch (error) {
      console.error('[IMPORT] Erro ao importar:', error);
      toast.error('Erro ao importar bairros', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(prev => ({ ...prev, [cidadeNome]: false }));
    }
  };

  const cidades = [
    { nome: 'Porto Alegre', uf: 'RS' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Importar Bairros de Porto Alegre</h1>
        <p className="text-muted-foreground">
          Busca geometrias reais de bairros usando OpenStreetMap
        </p>
      </div>
      
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          Este processo busca os limites reais dos bairros de Porto Alegre no OpenStreetMap e os agrupa por zona.
          Cada zona processará até 5 bairros principais. O processo leva aproximadamente 2-3 minutos.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4">
        {cidades.map(cidade => {
          const isLoading = loading[cidade.nome];
          const result = results[cidade.nome];
          
          return (
            <Card key={cidade.nome}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{cidade.nome} - {cidade.uf}</span>
                  {result && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result && (
                  <div className="text-sm text-muted-foreground mb-2">
                    Última atualização: agora
                    <br />
                    Fonte: OpenStreetMap ({result.total_bairros} bairros em {result.total_zonas} zonas)
                  </div>
                )}
                
                <Button 
                  onClick={() => importar(cidade.nome)}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando bairros...
                    </>
                  ) : (
                    result ? 'Reimportar Bairros' : 'Importar Bairros Reais'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {Object.entries(results).map(([cidadeNome, result]) => (
        <Card key={cidadeNome}>
          <CardHeader>
            <CardTitle>Resultados - {cidadeNome}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm">
                <strong>Total de bairros processados:</strong> {result.total_bairros}
                <br />
                <strong>Total de zonas:</strong> {result.total_zonas}
              </p>
            </div>
            
            <div className="space-y-2">
              {result.resultados.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    {r.status === 'atualizado' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : r.status === 'erro' ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium">{r.zona}</p>
                      {r.bairros && (
                        <p className="text-sm text-muted-foreground">
                          {r.bairros} bairros inclusos
                          {r.bairros_nomes && `: ${r.bairros_nomes.join(', ')}`}
                        </p>
                      )}
                      {r.erro && (
                        <p className="text-sm text-red-600">{r.erro}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm capitalize">{r.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
