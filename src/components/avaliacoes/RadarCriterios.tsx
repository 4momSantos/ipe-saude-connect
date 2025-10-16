import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface RadarCriteriosProps {
  criterios: Array<{ nome: string; media: number }> | null;
}

export function RadarCriterios({ criterios }: RadarCriteriosProps) {
  if (!criterios || criterios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise por Critérios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma avaliação de desempenho registrada ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = criterios.map(c => ({
    criterio: c.nome,
    pontuacao: Number(c.media.toFixed(1)),
    fullMark: 5
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise por Critérios</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="criterio" />
            <PolarRadiusAxis angle={90} domain={[0, 5]} />
            <Radar 
              name="Pontuação" 
              dataKey="pontuacao" 
              stroke="hsl(var(--primary))" 
              fill="hsl(var(--primary))" 
              fillOpacity={0.6} 
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
