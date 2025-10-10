import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, TrendingDown, Download, Calendar, Filter } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RelatorioAvaliacoes() {
  const [periodo, setPeriodo] = useState<"7dias" | "30dias" | "90dias" | "mesatual">("30dias");
  const [categoria, setCategoria] = useState<string>("todas");

  // Calcular intervalo de datas
  const getDateRange = () => {
    const hoje = new Date();
    switch (periodo) {
      case "7dias":
        return { inicio: subDays(hoje, 7), fim: hoje };
      case "30dias":
        return { inicio: subDays(hoje, 30), fim: hoje };
      case "90dias":
        return { inicio: subDays(hoje, 90), fim: hoje };
      case "mesatual":
        return { inicio: startOfMonth(hoje), fim: endOfMonth(hoje) };
      default:
        return { inicio: subDays(hoje, 30), fim: hoje };
    }
  };

  const { inicio, fim } = getDateRange();

  // Query: Estatísticas gerais
  const { data: stats } = useQuery({
    queryKey: ["avaliacoes-stats", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("calcular_estatisticas_avaliacoes", {
        p_periodo_inicio: format(inicio, "yyyy-MM-dd"),
        p_periodo_fim: format(fim, "yyyy-MM-dd"),
      });
      if (error) throw error;
      return data?.[0] || { media_geral: 0, total_avaliacoes: 0, credenciados_avaliados: 0, melhor_nota: 0, pior_nota: 0 };
    },
  });

  // Query: Top 10 melhores
  const { data: top10 } = useQuery({
    queryKey: ["avaliacoes-top10", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_prestadores")
        .select(`
          id,
          pontuacao_geral,
          credenciado_id,
          credenciados!inner(nome)
        `)
        .gte("periodo_referencia", format(inicio, "yyyy-MM-dd"))
        .lte("periodo_referencia", format(fim, "yyyy-MM-dd"))
        .eq("status", "finalizada")
        .order("pontuacao_geral", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Query: Bottom 10 (precisam atenção)
  const { data: bottom10 } = useQuery({
    queryKey: ["avaliacoes-bottom10", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_prestadores")
        .select(`
          id,
          pontuacao_geral,
          credenciado_id,
          credenciados!inner(nome)
        `)
        .gte("periodo_referencia", format(inicio, "yyyy-MM-dd"))
        .lte("periodo_referencia", format(fim, "yyyy-MM-dd"))
        .eq("status", "finalizada")
        .order("pontuacao_geral", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  // Query: Distribuição de notas
  const { data: distribuicao } = useQuery({
    queryKey: ["avaliacoes-distribuicao", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_prestadores")
        .select("pontuacao_geral")
        .gte("periodo_referencia", format(inicio, "yyyy-MM-dd"))
        .lte("periodo_referencia", format(fim, "yyyy-MM-dd"))
        .eq("status", "finalizada");
      if (error) throw error;

      // Agrupar por faixas
      const faixas = [
        { nome: "0-1", min: 0, max: 1, count: 0 },
        { nome: "1-2", min: 1, max: 2, count: 0 },
        { nome: "2-3", min: 2, max: 3, count: 0 },
        { nome: "3-4", min: 3, max: 4, count: 0 },
        { nome: "4-5", min: 4, max: 5, count: 0 },
      ];

      data?.forEach((av: any) => {
        const nota = av.pontuacao_geral;
        const faixa = faixas.find((f) => nota >= f.min && nota < f.max);
        if (faixa) faixa.count++;
      });

      return faixas;
    },
  });

  // Query: Evolução temporal (últimos 6 períodos)
  const { data: evolucao } = useQuery({
    queryKey: ["avaliacoes-evolucao", inicio, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes_prestadores")
        .select("pontuacao_geral, periodo_referencia")
        .gte("periodo_referencia", format(inicio, "yyyy-MM-dd"))
        .lte("periodo_referencia", format(fim, "yyyy-MM-dd"))
        .eq("status", "finalizada")
        .order("periodo_referencia", { ascending: true });
      if (error) throw error;

      // Agrupar por mês/semana
      const agrupado: Record<string, { total: number; count: number }> = {};
      data?.forEach((av: any) => {
        const mes = format(new Date(av.periodo_referencia), "MMM/yy", { locale: ptBR });
        if (!agrupado[mes]) agrupado[mes] = { total: 0, count: 0 };
        agrupado[mes].total += av.pontuacao_geral;
        agrupado[mes].count += 1;
      });

      return Object.entries(agrupado).map(([mes, { total, count }]) => ({
        mes,
        media: total / count,
      }));
    },
  });

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  const handleExport = () => {
    // Implementar exportação via jsPDF ou xlsx
    console.log("Exportar relatório");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Avaliações</h1>
          <p className="text-muted-foreground">Análise de desempenho dos credenciados</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Período</label>
            <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                <SelectItem value="mesatual">Mês atual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Categoria</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="atendimento">Atendimento</SelectItem>
                <SelectItem value="pontualidade">Pontualidade</SelectItem>
                <SelectItem value="qualidade">Qualidade Técnica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Geral</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.media_geral?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">de 5.00 estrelas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_avaliacoes || 0}</div>
            <p className="text-xs text-muted-foreground">no período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Melhor Nota</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.melhor_nota?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">nota máxima</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pior Nota</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.pior_nota?.toFixed(2) || "0.00"}</div>
            <p className="text-xs text-muted-foreground">nota mínima</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Notas</CardTitle>
            <CardDescription>Frequência de avaliações por faixa de nota</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicao || []}
                  dataKey="count"
                  nameKey="nome"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {distribuicao?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução Temporal</CardTitle>
            <CardDescription>Média de avaliações ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolucao || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="media" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabelas de Ranking */}
      <Tabs defaultValue="top10" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="top10">🏆 Top 10 Melhores</TabsTrigger>
          <TabsTrigger value="bottom10">⚠️ Precisam Atenção</TabsTrigger>
        </TabsList>

        <TabsContent value="top10">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Credenciados com Melhor Desempenho</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {top10?.map((item: any, index: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">{index + 1}</TableCell>
                      <TableCell>{item.credenciados.nome}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-500">
                          {item.pontuacao_geral.toFixed(2)} ⭐
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Excelente</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bottom10">
          <Card>
            <CardHeader>
              <CardTitle>Credenciados que Precisam de Atenção</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Nota</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bottom10?.map((item: any, index: number) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-bold">{index + 1}</TableCell>
                      <TableCell>{item.credenciados.nome}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {item.pontuacao_geral.toFixed(2)} ⭐
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">Crítico</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
