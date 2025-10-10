import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GerenciarRegrasSuspensao } from "@/components/credenciados/GerenciarRegrasSuspensao";
import { Shield, Activity, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GestaoRegrasSuspensao() {
  // Query: Estatísticas das regras
  const { data: statsRegras } = useQuery({
    queryKey: ["stats-regras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regras_suspensao_automatica")
        .select("*");
      if (error) throw error;

      const ativas = data?.filter((r) => r.ativo).length || 0;
      const inativas = data?.filter((r) => !r.ativo).length || 0;
      const total = data?.length || 0;

      return { ativas, inativas, total };
    },
  });

  // Query: Suspensões aplicadas no mês
  const { data: suspensoesStats } = useQuery({
    queryKey: ["suspensoes-mes"],
    queryFn: async () => {
      const inicioMes = format(new Date(new Date().setDate(1)), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("logs_regras_suspensao")
        .select("*")
        .gte("aplicado_em", inicioMes);
      if (error) throw error;

      const automaticas = data?.filter((l) => l.aplicado_por === "sistema").length || 0;
      const manuais = data?.filter((l) => l.aplicado_por !== "sistema").length || 0;
      const total = data?.length || 0;

      return { automaticas, manuais, total };
    },
  });

  // Query: Evolução de suspensões (últimos 30 dias)
  const { data: evolucao } = useQuery({
    queryKey: ["evolucao-suspensoes"],
    queryFn: async () => {
      const inicio = format(subDays(new Date(), 30), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("logs_regras_suspensao")
        .select("aplicado_em, aplicado_por")
        .gte("aplicado_em", inicio)
        .order("aplicado_em", { ascending: true });
      if (error) throw error;

      // Agrupar por dia
      const agrupado: Record<string, { automaticas: number; manuais: number }> = {};
      data?.forEach((log: any) => {
        const dia = format(new Date(log.aplicado_em), "dd/MM", { locale: ptBR });
        if (!agrupado[dia]) agrupado[dia] = { automaticas: 0, manuais: 0 };
        if (log.aplicado_por === "sistema") {
          agrupado[dia].automaticas += 1;
        } else {
          agrupado[dia].manuais += 1;
        }
      });

      return Object.entries(agrupado).map(([dia, { automaticas, manuais }]) => ({
        dia,
        automaticas,
        manuais,
      }));
    },
  });

  // Query: Logs recentes
  const { data: logsRecentes } = useQuery({
    queryKey: ["logs-recentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs_regras_suspensao")
        .select(`
          *,
          credenciados!inner(nome),
          regras_suspensao_automatica(nome)
        `)
        .order("aplicado_em", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestão de Regras de Suspensão</h1>
        <p className="text-muted-foreground">Administre regras automáticas e monitore aplicações</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regras Ativas</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statsRegras?.ativas || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {statsRegras?.total || 0} regras cadastradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regras Inativas</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsRegras?.inativas || 0}</div>
            <p className="text-xs text-muted-foreground">pausadas ou desativadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspensões no Mês</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suspensoesStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {suspensoesStats?.automaticas || 0} automáticas / {suspensoesStats?.manuais || 0} manuais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Automação</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {suspensoesStats?.total
                ? ((suspensoesStats.automaticas / suspensoesStats.total) * 100).toFixed(0)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">de suspensões automáticas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Suspensões (Últimos 30 Dias)</CardTitle>
          <CardDescription>Comparativo entre suspensões automáticas e manuais</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={evolucao || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="dia" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="automaticas" fill="#8884d8" name="Automáticas" />
              <Bar dataKey="manuais" fill="#82ca9d" name="Manuais" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabs: Gerenciar Regras e Logs */}
      <Tabs defaultValue="regras" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="regras">⚙️ Gerenciar Regras</TabsTrigger>
          <TabsTrigger value="logs">📋 Histórico de Aplicações</TabsTrigger>
        </TabsList>

        <TabsContent value="regras">
          <GerenciarRegrasSuspensao />
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Aplicações</CardTitle>
              <CardDescription>Últimas 20 suspensões aplicadas automaticamente</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Credenciado</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Aplicado por</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsRecentes?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {format(new Date(log.aplicado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{log.credenciados?.nome || "N/A"}</TableCell>
                      <TableCell className="text-xs">{log.regras_suspensao_automatica?.nome || "N/A"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.acao_aplicada === "suspensao"
                              ? "destructive"
                              : log.acao_aplicada === "alerta"
                              ? "default"
                              : "outline"
                          }
                        >
                          {log.acao_aplicada}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.aplicado_por === "sistema" ? "secondary" : "outline"}>
                          {log.aplicado_por}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">{log.motivo}</TableCell>
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
