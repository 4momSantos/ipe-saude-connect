import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ImportResult {
  cidade: string;
  total_distritos: number;
  resultados: Array<{
    zona: string;
    status: string;
    distritos?: number;
    erro?: string;
  }>;
}

export function ImportarGeometrias() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, ImportResult>>({});

  const importar = async (cidadeNome: string) => {
    setLoading(prev => ({ ...prev, [cidadeNome]: true }));
    
    try {
      console.log(`[IMPORT] Iniciando importação para ${cidadeNome}`);
      
      const { data, error } = await supabase.functions.invoke('importar-geometrias-ibge', {
        body: { cidade_nome: cidadeNome }
      });
      
      if (error) {
        console.error('[IMPORT] Erro:', error);
        throw error;
      }
      
      console.log('[IMPORT] Resultado:', data);
      
      setResults(prev => ({ ...prev, [cidadeNome]: data }));
      
      toast.success(`Geometrias de ${cidadeNome} importadas!`, {
        description: `${data.total_distritos} distritos processados`
      });
      
    } catch (error) {
      console.error('[IMPORT] Erro ao importar:', error);
      toast.error('Erro ao importar geometrias', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(prev => ({ ...prev, [cidadeNome]: false }));
    }
  };

  const cidades = [
    { nome: 'São Paulo', uf: 'SP' },
    { nome: 'Porto Alegre', uf: 'RS' },
    { nome: 'Recife', uf: 'PE' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Importar Geometrias Reais</h1>
        <p className="text-muted-foreground">
          Substitua os polígonos aproximados por limites oficiais do IBGE
        </p>
      </div>
      
      <Alert>
        <MapPin className="h-4 w-4" />
        <AlertDescription>
          Este processo baixa os limites oficiais dos distritos do IBGE e os agrupa em zonas geográficas.
          O processo pode levar de 2 a 5 minutos por cidade.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    Fonte: IBGE ({result.total_distritos} distritos)
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
                      Importando...
                    </>
                  ) : (
                    result ? 'Reimportar Geometrias' : 'Importar Geometrias'
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
                <strong>Total de distritos:</strong> {result.total_distritos}
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
                      <p className="font-medium">Zona {r.zona}</p>
                      {r.distritos && (
                        <p className="text-sm text-muted-foreground">
                          {r.distritos} distritos inclusos
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
