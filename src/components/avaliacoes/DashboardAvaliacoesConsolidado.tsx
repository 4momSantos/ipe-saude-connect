import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Award, AlertCircle } from "lucide-react";
import { useEstatisticasHibridas } from "@/hooks/useEstatisticasHibridas";
import { RadarCriterios } from "./RadarCriterios";
import { ComparativoAvaliacoes } from "./ComparativoAvaliacoes";

interface DashboardAvaliacoesConsolidadoProps {
  credenciadoId: string;
}

const badgeLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  top_rated_publico: { label: "⭐ Top Avaliado", variant: "default" },
  excelencia_interna: { label: "🏆 Excelência Interna", variant: "secondary" },
  elite_performer: { label: "👑 Elite Performer", variant: "default" }
};

export function DashboardAvaliacoesConsolidado({ credenciadoId }: DashboardAvaliacoesConsolidadoProps) {
  const { data: stats, isLoading } = useEstatisticasHibridas(credenciadoId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 animate-pulse bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 4.5) return "text-green-600";
    if (score >= 4.0) return "text-blue-600";
    if (score >= 3.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getDiscrepancia = () => {
    if (!stats.nota_media_publica || !stats.nota_media_interna) return null;
    const diff = Math.abs(stats.nota_media_publica - stats.nota_media_interna);
    return diff;
  };

  const discrepancia = getDiscrepancia();

  return (
    <div className="space-y-6">
      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              Avaliação Pública
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(stats.nota_media_publica)}`}>
              {stats.nota_media_publica?.toFixed(1) || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total_avaliacoes_publicas} avaliações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Avaliação Interna
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(stats.nota_media_interna)}`}>
              {stats.nota_media_interna?.toFixed(1) || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total_avaliacoes_internas} avaliações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              Performance Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(stats.performance_score)}`}>
              {stats.performance_score?.toFixed(1) || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Score híbrido (60% público + 40% interno)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de Discrepância */}
      {discrepancia !== null && discrepancia > 1.0 && (
        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Discrepância Detectada</p>
                <p className="text-sm text-muted-foreground">
                  Diferença de {discrepancia.toFixed(1)} pontos entre avaliação pública e interna. 
                  Recomenda-se investigar possíveis causas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {stats.badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Conquistas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.badges.map(badge => {
                const config = badgeLabels[badge];
                return config ? (
                  <Badge key={badge} variant={config.variant}>
                    {config.label}
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComparativoAvaliacoes credenciadoId={credenciadoId} />
        <RadarCriterios criterios={stats.criterios_destaque} />
      </div>

      {/* Pontos Fortes e Fracos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pontos Fortes</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pontos_fortes.length > 0 ? (
              <ul className="space-y-2">
                {stats.pontos_fortes.slice(0, 3).map((ponto, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span>{ponto}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum ponto forte registrado.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pontos de Melhoria</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.pontos_fracos.length > 0 ? (
              <ul className="space-y-2">
                {stats.pontos_fracos.slice(0, 3).map((ponto, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-yellow-600">⚠</span>
                    <span>{ponto}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum ponto de melhoria registrado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
