import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { EstatisticasRede } from "@/hooks/useRedeAnalitica";

interface DashboardKPIsRedeProps {
  stats?: EstatisticasRede;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

export function DashboardKPIsRede({ stats }: DashboardKPIsRedeProps) {
  if (!stats) {
    return <div>Carregando dados...</div>;
  }

  const especialidadesData = stats.top_especialidades?.map(e => ({
    name: e.especialidade,
    media: e.media,
    profissionais: e.profissionais
  })) || [];

  const geograficaData = stats.distribuicao_geografica?.map(d => ({
    name: d.estado,
    total: d.total
  })) || [];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Top Especialidades por Avaliação */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Especialidades</CardTitle>
          <CardDescription>Melhores avaliações médias por especialidade</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={especialidadesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="name" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="media" fill="#6366f1" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição Geográfica */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição Geográfica</CardTitle>
          <CardDescription>Profissionais ativos por estado</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={geograficaData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="total"
              >
                {geograficaData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lista de Especialidades */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Detalhamento por Especialidade</CardTitle>
          <CardDescription>Número de profissionais e avaliação média</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {especialidadesData.map((esp, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="font-medium">{esp.name}</p>
                  <p className="text-sm text-muted-foreground">{esp.profissionais} profissionais</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: COLORS[index] }}>
                      {esp.media.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">média</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
