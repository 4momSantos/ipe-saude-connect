import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, AlertTriangle, CheckCircle2, TrendingUp, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface DimensionamentoData {
  especialidade: string;
  credenciadosAtivos: number;
  populacaoEstimada: number;
  coberturaAtual: number;
  coberturaNecessaria: number;
  status: "adequado" | "alerta" | "critico";
  deficit: number;
}

// População estimada por região (em milhares)
const populacaoRegioes: Record<string, number> = {
  "Norte": 18906,
  "Nordeste": 57374,
  "Centro-Oeste": 16707,
  "Sudeste": 89632,
  "Sul": 30402,
};

// Cobertura mínima recomendada por 100 mil habitantes
const coberturaMinimaEspecialidade: Record<string, number> = {
  "Cardiologia": 15,
  "Ortopedia": 12,
  "Pediatria": 20,
  "Neurologia": 10,
  "Dermatologia": 8,
  "Psiquiatria": 10,
  "Ginecologia": 15,
  "default": 10,
};

export function DimensionamentoRede() {
  const [dimensionamento, setDimensionamento] = useState<DimensionamentoData[]>([]);
  const [regiaoFilter, setRegiaoFilter] = useState<string>("Brasil");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDimensionamento();
  }, [regiaoFilter]);

  async function loadDimensionamento() {
    try {
      setLoading(true);

      // Buscar credenciados por região se filtrado
      let query = supabase
        .from("credenciados")
        .select("id, estado")
        .eq("status", "Ativo");

      const { data: credenciadosData, error: credError } = await query;
      if (credError) throw credError;

      // Filtrar por região se necessário
      let credenciadosFiltrados = credenciadosData || [];
      let populacaoTotal = Object.values(populacaoRegioes).reduce((a, b) => a + b, 0);

      if (regiaoFilter !== "Brasil") {
        const regiaoMap: Record<string, string[]> = {
          Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
          Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
          "Centro-Oeste": ["DF", "GO", "MT", "MS"],
          Sudeste: ["ES", "MG", "RJ", "SP"],
          Sul: ["PR", "RS", "SC"],
        };

        credenciadosFiltrados = credenciadosFiltrados.filter((c) =>
          regiaoMap[regiaoFilter]?.includes(c.estado || "")
        );
        populacaoTotal = populacaoRegioes[regiaoFilter] || populacaoTotal;
      }

      // Buscar especialidades
      const credenciadoIds = credenciadosFiltrados.map((c) => c.id);
      const { data: especialidadesData, error: espError } = await supabase
        .from("credenciado_crms")
        .select("credenciado_id, especialidade")
        .in("credenciado_id", credenciadoIds);

      if (espError) throw espError;

      // Calcular dimensionamento por especialidade
      const especialidadesCount = especialidadesData?.reduce((acc, item) => {
        acc[item.especialidade] = (acc[item.especialidade] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const dimensionamentoData: DimensionamentoData[] = Object.entries(
        especialidadesCount || {}
      ).map(([especialidade, count]) => {
        const coberturaNecessaria =
          coberturaMinimaEspecialidade[especialidade] ||
          coberturaMinimaEspecialidade.default;

        const necessario = Math.ceil((populacaoTotal / 100) * coberturaNecessaria);
        const coberturaAtual = (count / necessario) * 100;
        const deficit = Math.max(0, necessario - count);

        let status: "adequado" | "alerta" | "critico";
        if (coberturaAtual >= 100) status = "adequado";
        else if (coberturaAtual >= 70) status = "alerta";
        else status = "critico";

        return {
          especialidade,
          credenciadosAtivos: count,
          populacaoEstimada: populacaoTotal,
          coberturaAtual: Math.min(100, coberturaAtual),
          coberturaNecessaria: necessario,
          status,
          deficit,
        };
      });

      // Ordenar por status (crítico primeiro)
      dimensionamentoData.sort((a, b) => {
        const statusOrder = { critico: 0, alerta: 1, adequado: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      });

      setDimensionamento(dimensionamentoData);
    } catch (error) {
      console.error("Erro ao calcular dimensionamento:", error);
      toast.error("Erro ao calcular dimensionamento de rede");
    } finally {
      setLoading(false);
    }
  }

  const statusColors = {
    adequado: "hsl(var(--chart-2))",
    alerta: "hsl(var(--chart-4))",
    critico: "hsl(var(--chart-8))",
  };

  const statusIcons = {
    adequado: CheckCircle2,
    alerta: AlertTriangle,
    critico: AlertTriangle,
  };

  const statusLabels = {
    adequado: "Adequado",
    alerta: "Atenção",
    critico: "Crítico",
  };

  const totalCredenciados = dimensionamento.reduce((sum, d) => sum + d.credenciadosAtivos, 0);
  const especialidadesCriticas = dimensionamento.filter((d) => d.status === "critico").length;
  const deficitTotal = dimensionamento.reduce((sum, d) => sum + d.deficit, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Calculando dimensionamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de Região */}
      <Card className="card-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Dimensionamento de Rede</CardTitle>
              <CardDescription>
                Análise de cobertura baseada em população e especialidade
              </CardDescription>
            </div>
            <Select value={regiaoFilter} onValueChange={setRegiaoFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Brasil">Brasil (Todas)</SelectItem>
                <SelectItem value="Norte">Região Norte</SelectItem>
                <SelectItem value="Nordeste">Região Nordeste</SelectItem>
                <SelectItem value="Centro-Oeste">Centro-Oeste</SelectItem>
                <SelectItem value="Sudeste">Região Sudeste</SelectItem>
                <SelectItem value="Sul">Região Sul</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Credenciados</p>
                    <p className="text-2xl font-bold text-blue-400">{totalCredenciados}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Esp. Críticas</p>
                    <p className="text-2xl font-bold text-red-400">{especialidadesCriticas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-500/10 border-orange-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-orange-400" />
                  <div>
                    <p className="text-sm text-muted-foreground">Déficit Total</p>
                    <p className="text-2xl font-bold text-orange-400">{deficitTotal}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Alertas Críticos */}
      {especialidadesCriticas > 0 && (
        <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="ml-2">
            <strong>{especialidadesCriticas} especialidades</strong> estão com cobertura crítica
            (abaixo de 70%). Ação imediata necessária!
          </AlertDescription>
        </Alert>
      )}

      {/* Gráfico de Cobertura */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle>Cobertura por Especialidade</CardTitle>
          <CardDescription>Percentual de cobertura em relação ao ideal</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dimensionamento}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="especialidade"
                angle={-45}
                textAnchor="end"
                height={100}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="coberturaAtual" radius={[8, 8, 0, 0]}>
                {dimensionamento.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={statusColors[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lista Detalhada */}
      <div className="grid gap-4">
        {dimensionamento.map((dim) => {
          const StatusIcon = statusIcons[dim.status];
          return (
            <Card
              key={dim.especialidade}
              className="hover-lift"
              style={{ borderColor: statusColors[dim.status] + "40" }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold">{dim.especialidade}</h3>
                      <p className="text-sm text-muted-foreground">
                        População: {(dim.populacaoEstimada / 1000).toFixed(0)}k habitantes
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="gap-2"
                    style={{
                      borderColor: statusColors[dim.status],
                      color: statusColors[dim.status],
                    }}
                  >
                    <StatusIcon className="h-4 w-4" />
                    {statusLabels[dim.status]}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Cobertura Atual</span>
                    <span className="font-semibold">{dim.coberturaAtual.toFixed(1)}%</span>
                  </div>
                  <Progress
                    value={dim.coberturaAtual}
                    className="h-2"
                    style={
                      {
                        "--progress-background": statusColors[dim.status],
                      } as React.CSSProperties
                    }
                  />

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Credenciados</p>
                      <p className="text-lg font-bold">{dim.credenciadosAtivos}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Necessário</p>
                      <p className="text-lg font-bold">{dim.coberturaNecessaria}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Déficit</p>
                      <p className="text-lg font-bold text-red-400">{dim.deficit}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
