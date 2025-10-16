import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { AvaliacaoDesempenho } from "@/components/credenciados/AvaliacaoDesempenho";
import { HistoricoAvaliacoes } from "@/components/credenciados/HistoricoAvaliacoes";
import { DashboardAvaliacoesConsolidado } from "@/components/avaliacoes/DashboardAvaliacoesConsolidado";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAvaliacoesPublicas } from "@/hooks/useAvaliacoesPublicas";
import { AvaliacaoCard } from "@/components/avaliacoes/AvaliacaoCard";

export default function AvaliacoesCredenciado() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: credenciado, isLoading } = useQuery({
    queryKey: ['credenciado', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credenciados')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const { data: avaliacoesPublicas, isLoading: isLoadingPublicas } = useAvaliacoesPublicas(id || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (!credenciado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Credenciado não encontrado</h2>
          <Button onClick={() => navigate('/credenciados')}>
            Voltar para lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/credenciados/${id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{credenciado.nome}</h1>
          <p className="text-muted-foreground">Sistema de Avaliações</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="publicas">Avaliações Públicas</TabsTrigger>
          <TabsTrigger value="desempenho">Avaliação de Desempenho</TabsTrigger>
          <TabsTrigger value="historico">Histórico Interno</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <DashboardAvaliacoesConsolidado credenciadoId={id!} />
        </TabsContent>

        <TabsContent value="publicas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Avaliações Públicas</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPublicas ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : !avaliacoesPublicas?.pages || avaliacoesPublicas.pages[0]?.avaliacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma avaliação pública registrada ainda.
                </p>
              ) : (
                <div className="space-y-4">
                  {avaliacoesPublicas.pages.map((page) =>
                    page.avaliacoes.map((avaliacao) => (
                      <AvaliacaoCard key={avaliacao.id} avaliacao={avaliacao} />
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="desempenho" className="space-y-6">
          <AvaliacaoDesempenho credenciadoId={id!} />
        </TabsContent>

        <TabsContent value="historico" className="space-y-6">
          <HistoricoAvaliacoes credenciadoId={id!} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
