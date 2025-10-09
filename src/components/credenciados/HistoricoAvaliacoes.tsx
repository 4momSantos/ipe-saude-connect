import { useAvaliacoes } from "@/hooks/useAvaliacoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

export function HistoricoAvaliacoes({ credenciadoId }: { credenciadoId: string }) {
  const { avaliacoes, isLoading } = useAvaliacoes(credenciadoId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando avaliações...</div>;
  }

  if (avaliacoes.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Nenhuma avaliação registrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5" />
          Histórico de Avaliações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {avaliacoes.map((av) => (
            <div key={av.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant={av.status === 'finalizada' ? 'default' : 'secondary'}>
                      {av.status}
                    </Badge>
                    <span className="text-lg font-bold">
                      {av.pontuacao_geral?.toFixed(1)} ⭐
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Período: {new Date(av.periodo_referencia).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>

              {av.pontos_positivos && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-green-600">Pontos Positivos:</p>
                  <p className="text-sm">{av.pontos_positivos}</p>
                </div>
              )}

              {av.pontos_melhoria && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-orange-600">Pontos de Melhoria:</p>
                  <p className="text-sm">{av.pontos_melhoria}</p>
                </div>
              )}

              {av.recomendacoes && (
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Recomendações:</p>
                  <p className="text-sm">{av.recomendacoes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
