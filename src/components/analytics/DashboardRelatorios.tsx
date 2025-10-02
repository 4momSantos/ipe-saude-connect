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

const COLORS = [
  "hsl(217 91% 60%)",
  "hsl(271 81% 56%)",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(215 20% 35%)",
];

export function DashboardRelatorios() {
  const [data, setData] = useState<DashboardData>({
    totalCredenciados: 0,
    credenciadosPorEspecialidade: [],
    credenciadosPorRegiao: [],
    alertasInsuficiencia: [],
    tendenciaMensal: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      setLoading(true);

      // Total de credenciados ativos
      const { count: totalCredenciados, error: countError } = await supabase
        .from("credenciados")
        .select("*", { count: "exact", head: true })
        .eq("status", "Ativo");

      if (countError) throw countError;

      // Credenciados por especialidade
      const { data: especialidadesData, error: espError } = await supabase
        .from("credenciado_crms")
        .select("especialidade");

      if (espError) throw espError;

      const especialidadesCount = especialidadesData?.reduce((acc, item) => {
        acc[item.especialidade] = (acc[item.especialidade] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const credenciadosPorEspecialidade = Object.entries(especialidadesCount || {}).map(
        ([name, value]) => ({ name, value })
      );

      // Credenciados por região
      const { data: credenciadosData, error: credError } = await supabase
        .from("credenciados")
        .select("estado")
        .eq("status", "Ativo");

      if (credError) throw credError;

      const regiaoMap: Record<string, string[]> = {
        Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
        Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
        "Centro-Oeste": ["DF", "GO", "MT", "MS"],
        Sudeste: ["ES", "MG", "RJ", "SP"],
        Sul: ["PR", "RS", "SC"],
      };

      const credenciadosPorRegiao: { name: string; value: number }[] = [];
      Object.entries(regiaoMap).forEach(([regiao, estados]) => {
        const count = credenciadosData?.filter((c) =>
          estados.includes(c.estado || "")
        ).length || 0;
        if (count > 0) {
          credenciadosPorRegiao.push({ name: regiao, value: count });
        }
      });

      // Alertas de insuficiência (simulado)
      const alertasInsuficiencia = [
        { especialidade: "Cardiologia", deficit: 15 },
        { especialidade: "Neurologia", deficit: 8 },
        { especialidade: "Ortopedia", deficit: 5 },
      ];

      // Tendência mensal (simulado)
      const tendenciaMensal = [
        { mes: "Jan", credenciados: 120 },
        { mes: "Fev", credenciados: 135 },
        { mes: "Mar", credenciados: 148 },
        { mes: "Abr", credenciados: 162 },
        { mes: "Mai", credenciados: 178 },
        { mes: "Jun", credenciados: totalCredenciados || 190 },
      ];

      setData({
        totalCredenciados: totalCredenciados || 0,
        credenciadosPorEspecialidade,
        credenciadosPorRegiao,
        alertasInsuficiencia,
        tendenciaMensal,
      });
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  }

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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                <Bar dataKey="value" fill="hsl(217 91% 60%)" radius={[8, 8, 0, 0]} />
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
                  stroke="hsl(142 71% 45%)"
                  strokeWidth={3}
                  dot={{ fill: "hsl(142 71% 45%)", r: 5 }}
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
                <Bar dataKey="deficit" fill="hsl(0 84% 60%)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
