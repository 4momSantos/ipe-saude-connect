import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CheckCircle, TrendingUp, Clock, UserCheck, Workflow, Award, Target, Activity } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Separator } from "@/components/ui/separator";
import { AssignafyMonitor } from "@/components/contratos/AssignafyMonitor";

export function DashboardGestor() {
  const [stats, setStats] = useState({
    totalInscricoes: 0,
    inscricoesAprovadas: 0,
    editaisAtivos: 0,
    credenciadosAtivos: 0,
    pendentesAnalise: 0,
    workflows: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [editalData, setEditalData] = useState<any[]>([]);
  const [credenciadosData, setCredenciadosData] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Total de inscrições
      const { count: totalInscricoes } = await supabase
        .from('inscricoes_edital')
        .select('*', { count: 'exact', head: true });

      // Inscrições aprovadas
      const { count: aprovadas } = await supabase
        .from('inscricoes_edital')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aprovado');

      // Pendentes de análise
      const { count: pendentes } = await supabase
        .from('inscricoes_edital')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'em_analise');

      // Editais ativos
      const { count: editaisCount } = await supabase
        .from('editais')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aberto');

      // Credenciados ativos
      const { count: credenciados } = await supabase
        .from('credenciados')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ativo');

      // Workflows ativos
      const { count: workflows } = await supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats({
        totalInscricoes: totalInscricoes || 0,
        inscricoesAprovadas: aprovadas || 0,
        editaisAtivos: editaisCount || 0,
        credenciadosAtivos: credenciados || 0,
        pendentesAnalise: pendentes || 0,
        workflows: workflows || 0,
      });

      // Dados para gráfico - inscrições por status
      const { data: porStatus } = await supabase
        .from('inscricoes_edital')
        .select('status');

      if (porStatus) {
        const statusCount = porStatus.reduce((acc: any, curr) => {
          acc[curr.status] = (acc[curr.status] || 0) + 1;
          return acc;
        }, {});

        const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
        const chartData = Object.entries(statusCount).map(([status, count], idx) => ({
          name: status === 'em_analise' ? 'Em Análise' : 
                status === 'aprovado' ? 'Aprovado' : 
                status === 'rejeitado' ? 'Rejeitado' : 
                status === 'inabilitado' ? 'Inabilitado' : status,
          value: count,
          fill: colors[idx % colors.length]
        }));

        setChartData(chartData);
      }

      // Distribuição por edital
      const { data: editais } = await supabase
        .from('editais')
        .select('id, titulo, numero_edital')
        .eq('status', 'aberto');

      if (editais) {
        const editalStats = await Promise.all(
          editais.map(async (edital) => {
            const { count } = await supabase
              .from('inscricoes_edital')
              .select('*', { count: 'exact', head: true })
              .eq('edital_id', edital.id);
            
            return {
              name: edital.numero_edital || edital.titulo.substring(0, 20),
              value: count || 0,
              fill: `hsl(var(--chart-${(editais.indexOf(edital) % 5) + 1}))`
            };
          })
        );
        setEditalData(editalStats);
      }

      // Credenciados por especialidade
      const { data: crms } = await supabase
        .from('credenciado_crms')
        .select('especialidade, credenciado_id');

      if (crms) {
        const especialidadeCount = crms.reduce((acc: any, curr) => {
          acc[curr.especialidade] = (acc[curr.especialidade] || 0) + 1;
          return acc;
        }, {});

        const credData = Object.entries(especialidadeCount)
          .map(([name, value], idx) => ({
            name,
            value,
            fill: `hsl(var(--chart-${(idx % 5) + 1}))`
          }))
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, 6);
        
        setCredenciadosData(credData);
      }

      // Timeline dos últimos 6 meses
      const { data: inscricoesTimeline } = await supabase
        .from('inscricoes_edital')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString());

      if (inscricoesTimeline) {
        const monthCount = inscricoesTimeline.reduce((acc: any, curr) => {
          const month = new Date(curr.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        const timeline = Object.entries(monthCount).map(([mes, count]) => ({
          mes,
          inscricoes: count
        }));
        
        setTimelineData(timeline);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center">Carregando...</div>;
  }

  const taxaAprovacao = stats.totalInscricoes > 0 
    ? Math.round((stats.inscricoesAprovadas / stats.totalInscricoes) * 100) 
    : 0;

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-8 pb-8">
      {/* Header Premium */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-4 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-chart-2/5 rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <Award className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-transparent">
              Relatório Executivo
            </h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-base lg:text-lg">Visão completa e consolidada do sistema de credenciamento</p>
        </div>
      </div>

      {/* KPIs Premium Grid */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-chart-1 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total de Inscrições</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.totalInscricoes}</p>
              </div>
              <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-chart-1/10 flex items-center justify-center">
                <Users className="h-5 w-5 md:h-7 md:w-7 text-chart-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-2 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Taxa de Aprovação</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{taxaAprovacao}%</p>
              </div>
              <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-chart-2/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 md:h-7 md:w-7 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-3 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Credenciados Ativos</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.credenciadosAtivos}</p>
              </div>
              <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-chart-3/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 md:h-7 md:w-7 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-chart-4 hover:shadow-lg transition-shadow">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Editais Ativos</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.editaisAtivos}</p>
              </div>
              <div className="h-10 w-10 md:h-14 md:w-14 rounded-full bg-chart-4/10 flex items-center justify-center">
                <FileText className="h-5 w-5 md:h-7 md:w-7 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Análise - 2 Colunas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Distribuição por Status - Donut */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Distribuição por Status</CardTitle>
            </div>
            <CardDescription>Análise detalhada das inscrições</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={{
                status: { label: "Status", color: "hsl(var(--chart-1))" },
              }} className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição por Edital - Donut */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Inscrições por Edital</CardTitle>
            </div>
            <CardDescription>Volume de candidaturas por processo</CardDescription>
          </CardHeader>
          <CardContent>
            {editalData.length > 0 ? (
              <ChartContainer config={{
                edital: { label: "Edital", color: "hsl(var(--chart-2))" },
              }} className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={editalData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={true}
                    >
                      {editalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                Nenhum edital ativo
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seção de Credenciados e Workflows */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Credenciados por Especialidade - Donut */}
        <Card className="lg:col-span-2 hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle>Credenciados por Especialidade</CardTitle>
            </div>
            <CardDescription>Distribuição dos profissionais credenciados</CardDescription>
          </CardHeader>
          <CardContent>
            {credenciadosData.length > 0 ? (
              <ChartContainer config={{
                credenciados: { label: "Credenciados", color: "hsl(var(--chart-3))" },
              }} className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={credenciadosData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={true}
                    >
                      {credenciadosData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                Sem credenciados registrados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo de Workflows */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-primary" />
              <CardTitle>Workflows</CardTitle>
            </div>
            <CardDescription>Status dos processos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-chart-3/10 to-transparent border border-chart-3/20">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Workflows Ativos</p>
                  <p className="text-2xl font-bold text-foreground">{stats.workflows}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-chart-3" />
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-chart-4/10 to-transparent border border-chart-4/20">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-foreground">{stats.pendentesAnalise}</p>
                </div>
                <Clock className="h-8 w-8 text-chart-4" />
              </div>

              <Separator />

              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-chart-2/10 to-transparent border border-chart-2/20">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Aprovados</p>
                  <p className="text-2xl font-bold text-foreground">{stats.inscricoesAprovadas}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Timeline de Inscrições */}
      {timelineData.length > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Evolução de Inscrições</CardTitle>
            </div>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              inscricoes: { label: "Inscrições", color: "hsl(var(--chart-1))" },
            }} className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="inscricoes" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--chart-1))', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Monitor Integração Assinafy */}
      <AssignafyMonitor />
    </div>
  );
}
