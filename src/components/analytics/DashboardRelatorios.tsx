import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/MetricCard";
import { Users, Stethoscope, MapPin, AlertTriangle } from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardData {
  totalCredenciados: number;
  credenciadosPorEspecialidade: { name: string; value: number }[];
  credenciadosPorRegiao: { name: string; value: number }[];
  alertasInsuficiencia: { especialidade: string; deficit: number }[];
  tendenciaMensal: { mes: string; credenciados: number }[];
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
];

export function DashboardRelatorios() {
  // Dados simulados completos e realistas
  const [data] = useState<DashboardData>({
    totalCredenciados: 3847,
    credenciadosPorEspecialidade: [
      { name: "Clínica Geral", value: 524 },
      { name: "Cardiologia", value: 438 },
      { name: "Pediatria", value: 412 },
      { name: "Ortopedia", value: 385 },
      { name: "Ginecologia", value: 367 },
      { name: "Dermatologia", value: 298 },
      { name: "Neurologia", value: 276 },
      { name: "Oftalmologia", value: 254 },
      { name: "Psiquiatria", value: 231 },
      { name: "Urologia", value: 198 },
      { name: "Endocrinologia", value: 176 },
      { name: "Gastroenterologia", value: 154 },
      { name: "Pneumologia", value: 134 },
    ],
    credenciadosPorRegiao: [
      { name: "Sul", value: 1247 },
      { name: "Sudeste", value: 1089 },
      { name: "Centro-Oeste", value: 587 },
      { name: "Nordeste", value: 534 },
      { name: "Norte", value: 390 },
    ],
    alertasInsuficiencia: [
      { especialidade: "Neurologia", deficit: 42 },
      { especialidade: "Cardiologia", deficit: 38 },
      { especialidade: "Ortopedia", deficit: 31 },
      { especialidade: "Pediatria", deficit: 27 },
      { especialidade: "Psiquiatria", deficit: 24 },
      { especialidade: "Dermatologia", deficit: 19 },
    ],
    tendenciaMensal: [
      { mes: "Abr", credenciados: 3254 },
      { mes: "Mai", credenciados: 3412 },
      { mes: "Jun", credenciados: 3538 },
      { mes: "Jul", credenciados: 3621 },
      { mes: "Ago", credenciados: 3724 },
      { mes: "Set", credenciados: 3789 },
      { mes: "Out", credenciados: 3847 },
    ],
  });
  const [loading] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Métricas principais */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Credenciados"
          value={data.totalCredenciados}
          icon={Users}
          color="blue"
          trend={{ value: 12, isPositive: true }}
        />
        <MetricCard
          title="Especialidades"
          value={data.credenciadosPorEspecialidade.length}
          icon={Stethoscope}
          color="purple"
        />
        <MetricCard
          title="Regiões Cobertas"
          value={data.credenciadosPorRegiao.length}
          icon={MapPin}
          color="green"
        />
        <MetricCard
          title="Alertas de Insuficiência"
          value={data.alertasInsuficiencia.length}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Credenciados por Especialidade */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Credenciados por Especialidade</CardTitle>
            <CardDescription>Distribuição por área de atuação</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.credenciadosPorEspecialidade}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.credenciadosPorEspecialidade.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Credenciados por Região */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Credenciados por Região</CardTitle>
            <CardDescription>Distribuição geográfica</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.credenciadosPorRegiao}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {data.credenciadosPorRegiao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tendência Mensal */}
        <Card className="card-glow">
          <CardHeader>
            <CardTitle>Tendência de Crescimento</CardTitle>
            <CardDescription>Evolução de credenciados nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.tendenciaMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="credenciados"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-2))", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alertas de Insuficiência */}
        <Card className="card-glow border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-400">Alertas de Insuficiência de Rede</CardTitle>
            <CardDescription>Especialidades com déficit de credenciados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.alertasInsuficiencia} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  type="category"
                  dataKey="especialidade"
                  stroke="hsl(var(--muted-foreground))"
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="deficit" fill="hsl(var(--chart-8))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
