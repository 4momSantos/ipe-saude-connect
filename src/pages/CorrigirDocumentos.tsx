import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, FileCheck } from "lucide-react";

export default function CorrigirDocumentos() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const executarCorrecao = async () => {
    setLoading(true);
    setResultado(null);

    try {
      const { data, error } = await supabase.functions.invoke(
        'corrigir-credenciados-sem-documentos'
      );

      if (error) {
        console.error('Erro ao executar correção:', error);
        toast.error(`Erro: ${error.message}`);
        return;
      }

      console.log('Resultado da correção:', data);
      setResultado(data);
      
      if (data.success) {
        toast.success(data.message || 'Correção executada com sucesso!');
      } else {
        toast.error(data.message || 'Erro na correção');
      }
    } catch (error: any) {
      console.error('Exceção ao executar correção:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-6 w-6" />
            Correção de Documentos - Migração Retroativa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Esta função irá migrar automaticamente os documentos das inscrições para os credenciados 
            que ainda não tiveram seus documentos migrados.
          </p>

          <Button 
            onClick={executarCorrecao}
            disabled={loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <FileCheck className="mr-2 h-4 w-4" />
                Executar Migração de Documentos
              </>
            )}
          </Button>

          {resultado && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Resultado da Execução</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Total Processados:</strong> {resultado.total_processados || 0}
                  </div>
                  <div>
                    <strong>Sucessos:</strong> {resultado.total_sucessos || 0}
                  </div>
                  <div>
                    <strong>Falhas:</strong> {resultado.total_falhas || 0}
                  </div>
                  <div>
                    <strong>Migrados:</strong> {resultado.total_migrados || 0}
                  </div>
                </div>

                {resultado.resultados && resultado.resultados.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Detalhes por Credenciado:</h4>
                    <div className="space-y-2">
                      {resultado.resultados.map((r: any, i: number) => (
                        <div key={i} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{r.nome}</span>
                            {r.success ? (
                              <span className="text-green-600 text-sm">
                                ✓ {r.total_migrados || 0} docs migrados
                              </span>
                            ) : (
                              <span className="text-red-600 text-sm">
                                ✗ {r.error}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
