import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProcessarContratoOrfao } from "@/hooks/useProcessarContratoOrfao";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContratoOrfao {
  id: string;
  numero_contrato: string;
  inscricao_id: string;
  status: string;
  assinado_em: string;
  inscricao: {
    id: string;
    protocolo: string;
    candidato_id: string;
    dados_inscricao: any;
  };
  credenciado_exists: boolean;
}

export default function ProcessarContratosOrfaos() {
  const { processar, processarTodos, isProcessando, isProcessandoTodos } = useProcessarContratoOrfao();

  const { data: contratos, isLoading, refetch } = useQuery({
    queryKey: ["contratos-orfaos"],
    queryFn: async () => {
      // Buscar contratos assinados
      const { data: contratosData, error: contratosError } = await supabase
        .from("contratos")
        .select(`
          id,
          numero_contrato,
          inscricao_id,
          status,
          assinado_em,
          inscricao:inscricoes_edital(
            id,
            protocolo,
            candidato_id,
            dados_inscricao
          )
        `)
        .eq("status", "assinado")
        .order("assinado_em", { ascending: false });

      if (contratosError) throw contratosError;

      // Verificar quais têm credenciado
      const contratosComCheck = await Promise.all(
        (contratosData || []).map(async (contrato) => {
          const { data: credenciado } = await supabase
            .from("credenciados")
            .select("id")
            .eq("inscricao_id", contrato.inscricao_id)
            .maybeSingle();

          return {
            ...contrato,
            credenciado_exists: !!credenciado
          };
        })
      );

      // Filtrar apenas órfãos
      return contratosComCheck.filter(c => !c.credenciado_exists) as ContratoOrfao[];
    }
  });

  const handleProcessar = async (contratoId: string) => {
    await processar({ contratoId });
    await refetch();
  };

  const handleProcessarTodos = async () => {
    if (!contratos) return;
    const ids = contratos.map(c => c.id);
    await processarTodos(ids);
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const contratoCount = contratos?.length || 0;

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🚨 Contratos Órfãos</h1>
        <p className="text-muted-foreground">
          Contratos assinados que ainda não têm credenciado vinculado
        </p>
      </div>

      {contratoCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Tudo certo! 🎉</h2>
            <p className="text-muted-foreground">
              Não há contratos órfãos no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header com resumo e botão processar todos */}
          <Card className="mb-6 bg-orange-50 border-orange-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    {contratoCount} {contratoCount === 1 ? 'Contrato Órfão' : 'Contratos Órfãos'}
                  </CardTitle>
                  <CardDescription>
                    {contratoCount === 1 
                      ? 'Este contrato foi assinado mas não tem credenciado'
                      : 'Estes contratos foram assinados mas não têm credenciados'
                    }
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                  <Button
                    onClick={handleProcessarTodos}
                    disabled={isProcessandoTodos}
                  >
                    {isProcessandoTodos ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        🚀 Processar Todos ({contratoCount})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Lista de contratos */}
          <div className="space-y-4">
            {contratos.map((contrato) => {
              const candidatoNome = 
                contrato.inscricao?.dados_inscricao?.pessoa_juridica?.denominacao_social ||
                contrato.inscricao?.dados_inscricao?.dados_pessoais?.nome_completo ||
                'Nome não disponível';

              return (
                <Card key={contrato.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">
                          {contrato.numero_contrato}
                        </CardTitle>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Protocolo:</span> {contrato.inscricao?.protocolo}
                          </div>
                          <div>
                            <span className="font-medium">Candidato:</span> {candidatoNome}
                          </div>
                          <div>
                            <span className="font-medium">Assinado em:</span>{' '}
                            {contrato.assinado_em 
                              ? format(new Date(contrato.assinado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                              : 'Data não disponível'
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="destructive">Sem Credenciado</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleProcessar(contrato.id)}
                        disabled={isProcessando}
                        size="sm"
                      >
                        {isProcessando ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            🔧 Criar Credenciado
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/fluxo-credenciamento/${contrato.inscricao_id}`, '_blank')}
                      >
                        👁️ Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
