import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, CheckCircle, TrendingUp, Clock, UserCheck, Workflow } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
      const { count: editais } = await supabase
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
        editaisAtivos: editais || 0,
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

        const chartData = Object.entries(statusCount).map(([status, count]) => ({
          name: status === 'em_analise' ? 'Em Análise' : 
                status === 'aprovado' ? 'Aprovado' : 
                status === 'rejeitado' ? 'Rejeitado' : status,
          value: count
        }));

        setChartData(chartData);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel do Gestor</h1>
        <p className="text-muted-foreground">Visão completa do sistema de credenciamento</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Inscrições"
          value={stats.totalInscricoes}
          icon={Users}
          color="blue"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Pendentes Análise"
          value={stats.pendentesAnalise}
          icon={Clock}
          color="orange"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Taxa de Aprovação"
          value={taxaAprovacao}
          icon={TrendingUp}
          color="purple"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Credenciados Ativos"
          value={stats.credenciadosAtivos}
          icon={UserCheck}
          color="green"
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Inscrições por situação</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo do Sistema</CardTitle>
            <CardDescription>Estatísticas gerais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Editais Ativos</span>
              </div>
              <span className="text-2xl font-bold">{stats.editaisAtivos}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Aprovações</span>
              </div>
              <span className="text-2xl font-bold">{stats.inscricoesAprovadas}</span>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Workflow className="h-5 w-5 text-primary" />
                <span className="font-medium">Workflows Ativos</span>
              </div>
              <span className="text-2xl font-bold">{stats.workflows}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
