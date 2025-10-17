import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, XCircle, Copy } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Inscricao {
  id: string;
  status: string;
  created_at: string;
  protocolo?: string;
  editais: {
    titulo: string;
    especialidade: string | null;
  };
}

export function DashboardCandidato() {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInscricoes();
  }, []);

  async function loadInscricoes() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('inscricoes_edital')
        .select(`
          id,
          status,
          created_at,
          protocolo,
          editais (titulo, especialidade)
        `)
        .eq('candidato_id', user.id)
        .eq('is_rascunho', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInscricoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    total: inscricoes.length,
    em_analise: inscricoes.filter(i => i.status === 'em_analise').length,
    aprovadas: inscricoes.filter(i => i.status === 'aprovado').length,
    rejeitadas: inscricoes.filter(i => i.status === 'rejeitado').length,
  };

  const statusChartData = [
    { name: "Em Análise", value: stats.em_analise, fill: "hsl(var(--chart-4))" },
    { name: "Aprovadas", value: stats.aprovadas, fill: "hsl(var(--chart-2))" },
    { name: "Rejeitadas", value: stats.rejeitadas, fill: "hsl(var(--chart-8))" },
  ].filter(item => item.value > 0);

  const timelineData = inscricoes.slice(0, 6).map((insc, idx) => ({
    mes: format(new Date(insc.created_at), 'MMM/yy'),
    inscricoes: idx + 1,
  }));

  if (loading) {
    return <div className="text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Minhas Inscrições</h1>
        <p className="text-sm md:text-base text-muted-foreground">Acompanhe o status das suas candidaturas</p>
      </div>

      {/* Card de Protocolos */}
      {inscricoes.length > 0 && inscricoes.slice(0, 3).some(i => i.protocolo) && (
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileText className="h-4 w-4 md:h-5 md:w-5" />
              Seus Protocolos de Inscrição
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Números de protocolo para acompanhamento</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="space-y-2">
              {inscricoes.slice(0, 3).map(insc => insc.protocolo && (
                <div key={insc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 md:p-3 border rounded-lg bg-background gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs md:text-sm break-words">{insc.editais?.titulo}</p>
                    <Badge variant="outline" className="font-mono mt-1 text-[10px] md:text-xs break-all">
                      {insc.protocolo}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 md:h-8 md:w-8 flex-shrink-0 self-start sm:self-center"
                    onClick={() => {
                      navigator.clipboard.writeText(insc.protocolo!);
                      toast.success('Protocolo copiado!');
                    }}
                  >
                    <Copy className="h-3 w-3 md:h-4 md:w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Inscrições"
          value={stats.total}
          icon={FileText}
          color="blue"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Em Análise"
          value={stats.em_analise}
          icon={Clock}
          color="orange"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Aprovadas"
          value={stats.aprovadas}
          icon={CheckCircle}
          color="green"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Rejeitadas"
          value={stats.rejeitadas}
          icon={XCircle}
          color="red"
          trend={{ value: 0, isPositive: false }}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Visão geral das suas inscrições</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ChartContainer config={{
                em_analise: { label: "Em Análise", color: "hsl(var(--chart-1))" },
                aprovadas: { label: "Aprovadas", color: "hsl(var(--chart-2))" },
                rejeitadas: { label: "Rejeitadas", color: "hsl(var(--chart-3))" },
              }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma inscrição ainda
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Linha do Tempo</CardTitle>
            <CardDescription>Suas últimas inscrições</CardDescription>
          </CardHeader>
          <CardContent>
            {timelineData.length > 0 ? (
              <ChartContainer config={{
                inscricoes: { label: "Inscrições", color: "hsl(var(--chart-1))" },
              }} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="inscricoes" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma inscrição ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Inscrições</CardTitle>
          <CardDescription>Histórico das suas candidaturas</CardDescription>
        </CardHeader>
        <CardContent>
          {inscricoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Você ainda não possui inscrições. Acesse a página de Editais para se candidatar.
            </p>
          ) : (
            <div className="space-y-4">
              {inscricoes.map((inscricao) => (
                <div
                  key={inscricao.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 md:p-4 border rounded-lg hover:bg-accent/50 transition-colors gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm md:text-base text-foreground break-words">
                      {inscricao.editais.titulo}
                    </h3>
                    <p className="text-xs md:text-sm text-muted-foreground">
                      {inscricao.editais.especialidade || 'Sem especialidade'}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                      Inscrito em: {format(new Date(inscricao.created_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <StatusBadge status={inscricao.status as any} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
