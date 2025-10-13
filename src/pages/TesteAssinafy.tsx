import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, TestTube2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function TesteAssinafy() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const runTest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('test-assinafy-full', {
        body: {}
      });

      if (error) throw error;

      setResult(data);
      
      if (data.overall_status === 'SUCCESS') {
        toast({
          title: "✅ Teste Completo!",
          description: "Todos os testes passaram com sucesso!",
        });
      } else {
        toast({
          title: "❌ Teste Falhou",
          description: "Veja os detalhes abaixo",
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro ao executar teste",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube2 className="h-5 w-5" />
            🧪 Teste Completo - Integração Assinafy
          </CardTitle>
          <CardDescription>
            Executa todos os testes de validação da integração com Assinafy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runTest} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando Testes...
              </>
            ) : (
              'Executar Teste Completo'
            )}
          </Button>

          {result && (
            <div className="mt-6 space-y-4">
              {/* Status Geral */}
              <Card className={result.overall_status === 'SUCCESS' ? 'border-green-500' : 'border-red-500'}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {result.overall_status === 'SUCCESS' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    Status: {result.overall_status}
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Testes Individuais */}
              <div className="space-y-2">
                <h3 className="font-semibold">Resultados dos Testes:</h3>
                {result.tests?.map((test: any, index: number) => (
                  <Card key={index} className={test.status === 'passed' ? 'border-green-200' : 'border-red-200'}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {test.status === 'passed' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {test.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                      {test.error && (
                        <p className="text-red-600 text-sm mt-2">Erro: {test.error}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Sumário (se houver) */}
              {result.summary && (
                <Card className="border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-sm">📊 Sumário</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-blue-50 p-3 rounded overflow-auto">
                      {JSON.stringify(result.summary, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* JSON Completo */}
              <details className="mt-4">
                <summary className="cursor-pointer font-semibold">Ver JSON Completo</summary>
                <pre className="text-xs bg-gray-100 p-4 rounded mt-2 overflow-auto max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
