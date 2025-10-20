import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp, TrendingDown, Download, Calendar, Filter, FileSpreadsheet, FileText } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DataExporter } from "@/utils/exportData";

export default function RelatorioAvaliacoes() {
  const [periodo, setPeriodo] = useState<"7dias" | "30dias" | "90dias" | "mesatual">("30dias");
  const [categoria, setCategoria] = useState<string>("todas");
  const [especialidade, setEspecialidade] = useState<string>("todas");
  const [credenciadoFiltro, setCredenciadoFiltro] = useState<string>("todos");
  const [medicoFiltro, setMedicoFiltro] = useState<string>("todos");

  // Dados mockados completos com datas recentes e médicos
  const avaliacoesMock = useMemo(() => [
    { id: 1, credenciado: 'Hospital Central', medico: 'Carlos Santos', especialidade: 'Cardiologia', pontuacao: 4.8, categoria: 'atendimento', data: '2025-10-01', comentario: 'Excelente atendimento' },
    { id: 2, credenciado: 'Clínica Saúde', medico: 'Ana Lima', especialidade: 'Pediatria', pontuacao: 4.6, categoria: 'pontualidade', data: '2025-10-02', comentario: 'Muito pontual' },
    { id: 3, credenciado: 'Ortoclínica', medico: 'Pedro Oliveira', especialidade: 'Ortopedia', pontuacao: 4.4, categoria: 'qualidade', data: '2025-10-03', comentario: 'Boa qualidade técnica' },
    { id: 4, credenciado: 'Hospital Mulher', medico: 'Julia Costa', especialidade: 'Ginecologia', pontuacao: 4.7, categoria: 'atendimento', data: '2025-10-04', comentario: 'Atendimento humanizado' },
    { id: 5, credenciado: 'Hospital Central', medico: 'Roberto Silva', especialidade: 'Clínica Geral', pontuacao: 4.2, categoria: 'pontualidade', data: '2025-10-05', comentario: 'Bom atendimento geral' },
    { id: 6, credenciado: 'Centro Médico', medico: 'Mariana Souza', especialidade: 'Dermatologia', pontuacao: 3.8, categoria: 'qualidade', data: '2025-10-06', comentario: 'Precisa melhorar' },
    { id: 7, credenciado: 'Clínica Visão', medico: 'Fernando Alves', especialidade: 'Oftalmologia', pontuacao: 4.5, categoria: 'atendimento', data: '2025-10-07', comentario: 'Muito profissional' },
    { id: 8, credenciado: 'Neuro Centro', medico: 'Paulo Martins', especialidade: 'Neurologia', pontuacao: 4.3, categoria: 'pontualidade', data: '2025-10-08', comentario: 'Consulta no horário' },
    { id: 9, credenciado: 'Hospital São José', medico: 'Lucas Ferreira', especialidade: 'Cardiologia', pontuacao: 3.5, categoria: 'qualidade', data: '2025-10-09', comentario: 'Pode melhorar' },
    { id: 10, credenciado: 'Clínica Dor', medico: 'Patricia Rocha', especialidade: 'Ortopedia', pontuacao: 4.9, categoria: 'atendimento', data: '2025-10-10', comentario: 'Excelente profissional' },
    { id: 11, credenciado: 'Materno Infantil', medico: 'Beatriz Gomes', especialidade: 'Pediatria', pontuacao: 4.7, categoria: 'pontualidade', data: '2025-10-11', comentario: 'Ótimo com crianças' },
    { id: 12, credenciado: 'Clínica Pele', medico: 'Rodrigo Dias', especialidade: 'Dermatologia', pontuacao: 3.2, categoria: 'qualidade', data: '2025-10-12', comentario: 'Atendimento rápido demais' },
    { id: 13, credenciado: 'Hospital Central', medico: 'Camila Reis', especialidade: 'Ginecologia', pontuacao: 4.6, categoria: 'atendimento', data: '2025-09-25', comentario: 'Médica atenciosa' },
    { id: 14, credenciado: 'Clínica Saúde', medico: 'Marcos Pinto', especialidade: 'Clínica Geral', pontuacao: 4.1, categoria: 'pontualidade', data: '2025-09-26', comentario: 'Bom atendimento' },
    { id: 15, credenciado: 'Centro Neurológico', medico: 'André Castro', especialidade: 'Neurologia', pontuacao: 4.8, categoria: 'qualidade', data: '2025-09-27', comentario: 'Diagnóstico preciso' },
    { id: 16, credenciado: 'Hospital São José', medico: 'Bruno Mendes', especialidade: 'Ortopedia', pontuacao: 2.8, categoria: 'atendimento', data: '2025-09-28', comentario: 'Atendimento frio' },
    { id: 17, credenciado: 'Clínica Visão', medico: 'Leticia Barros', especialidade: 'Oftalmologia', pontuacao: 4.4, categoria: 'pontualidade', data: '2025-09-29', comentario: 'Consulta rápida' },
    { id: 18, credenciado: 'Ortoclínica', medico: 'Rafael Cunha', especialidade: 'Ortopedia', pontuacao: 4.7, categoria: 'qualidade', data: '2025-09-30', comentario: 'Excelente tratamento' },
    { id: 19, credenciado: 'Hospital Mulher', medico: 'Fernanda Lopes', especialidade: 'Ginecologia', pontuacao: 4.9, categoria: 'atendimento', data: '2025-09-15', comentario: 'Melhor médica da região' },
    { id: 20, credenciado: 'Clínica Dor', medico: 'Thiago Nunes', especialidade: 'Ortopedia', pontuacao: 3.9, categoria: 'pontualidade', data: '2025-09-16', comentario: 'Atraso na consulta' },
    { id: 21, credenciado: 'Hospital Central', medico: 'Carlos Santos', especialidade: 'Cardiologia', pontuacao: 5.0, categoria: 'qualidade', data: '2025-09-17', comentario: 'Perfeito!' },
    { id: 22, credenciado: 'Materno Infantil', medico: 'Sofia Azevedo', especialidade: 'Pediatria', pontuacao: 4.8, categoria: 'atendimento', data: '2025-09-18', comentario: 'Excelente pediatra' },
    { id: 23, credenciado: 'Clínica Pele', medico: 'Helena Moura', especialidade: 'Dermatologia', pontuacao: 3.6, categoria: 'pontualidade', data: '2025-08-20', comentario: 'Demora no atendimento' },
    { id: 24, credenciado: 'Centro Médico', medico: 'Gabriel Farias', especialidade: 'Clínica Geral', pontuacao: 4.3, categoria: 'qualidade', data: '2025-08-22', comentario: 'Bom diagnóstico' },
    { id: 25, credenciado: 'Neuro Centro', medico: 'Vinicius Teixeira', especialidade: 'Neurologia', pontuacao: 4.5, categoria: 'atendimento', data: '2025-08-25', comentario: 'Médico atencioso' },
    { id: 26, credenciado: 'Hospital Central', medico: 'Carlos Santos', especialidade: 'Cardiologia', pontuacao: 4.6, categoria: 'atendimento', data: '2025-10-13', comentario: 'Profissional dedicado' },
    { id: 27, credenciado: 'Clínica Saúde', medico: 'Ana Lima', especialidade: 'Pediatria', pontuacao: 4.4, categoria: 'qualidade', data: '2025-10-14', comentario: 'Diagnóstico assertivo' },
    { id: 28, credenciado: 'Ortoclínica', medico: 'Pedro Oliveira', especialidade: 'Ortopedia', pontuacao: 4.8, categoria: 'atendimento', data: '2025-10-15', comentario: 'Tratamento eficaz' },
    { id: 29, credenciado: 'Hospital Mulher', medico: 'Julia Costa', especialidade: 'Ginecologia', pontuacao: 4.5, categoria: 'pontualidade', data: '2025-10-16', comentario: 'Muito pontual' },
    { id: 30, credenciado: 'Centro Médico', medico: 'Mariana Souza', especialidade: 'Dermatologia', pontuacao: 4.0, categoria: 'qualidade', data: '2025-10-17', comentario: 'Bom profissional' },
  ], []);

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

  // Extrair listas únicas para os filtros
  const credenciadosUnicos = useMemo(() => 
    Array.from(new Set(avaliacoesMock.map(av => av.credenciado))).sort(), 
    [avaliacoesMock]
  );

  const medicosUnicos = useMemo(() => 
    Array.from(new Set(avaliacoesMock.map(av => av.medico))).sort(), 
    [avaliacoesMock]
  );

  // Filtrar dados mockados
  const dadosFiltrados = useMemo(() => {
    return avaliacoesMock.filter(av => {
      const dataAv = new Date(av.data);
      const dentroPeriodo = dataAv >= inicio && dataAv <= fim;
      const categoriaOk = categoria === 'todas' || av.categoria === categoria;
      const especialidadeOk = especialidade === 'todas' || av.especialidade === especialidade;
      const credenciadoOk = credenciadoFiltro === 'todos' || av.credenciado === credenciadoFiltro;
      const medicoOk = medicoFiltro === 'todos' || av.medico === medicoFiltro;
      return dentroPeriodo && categoriaOk && especialidadeOk && credenciadoOk && medicoOk;
    });
  }, [avaliacoesMock, inicio, fim, categoria, especialidade, credenciadoFiltro, medicoFiltro]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (dadosFiltrados.length === 0) {
      return { media_geral: 0, total_avaliacoes: 0, credenciados_avaliados: 0, melhor_nota: 0, pior_nota: 0 };
    }

    const notas = dadosFiltrados.map(av => av.pontuacao);
    const credenciadosUnicos = new Set(dadosFiltrados.map(av => av.credenciado)).size;

    return {
      media_geral: notas.reduce((a, b) => a + b, 0) / notas.length,
      total_avaliacoes: dadosFiltrados.length,
      credenciados_avaliados: credenciadosUnicos,
      melhor_nota: Math.max(...notas),
      pior_nota: Math.min(...notas)
    };
  }, [dadosFiltrados]);

  // Top 10 melhores
  const top10 = useMemo(() => {
    const grouped = dadosFiltrados.reduce((acc, av) => {
      if (!acc[av.credenciado]) {
        acc[av.credenciado] = { credenciado: av.credenciado, pontuacoes: [] };
      }
      acc[av.credenciado].pontuacoes.push(av.pontuacao);
      return acc;
    }, {} as Record<string, { credenciado: string; pontuacoes: number[] }>);

    return Object.values(grouped)
      .map(g => ({
        credenciado: g.credenciado,
        pontuacao_geral: g.pontuacoes.reduce((a, b) => a + b, 0) / g.pontuacoes.length
      }))
      .sort((a, b) => b.pontuacao_geral - a.pontuacao_geral)
      .slice(0, 10);
  }, [dadosFiltrados]);

  // Bottom 10
  const bottom10 = useMemo(() => {
    const grouped = dadosFiltrados.reduce((acc, av) => {
      if (!acc[av.credenciado]) {
        acc[av.credenciado] = { credenciado: av.credenciado, pontuacoes: [] };
      }
      acc[av.credenciado].pontuacoes.push(av.pontuacao);
      return acc;
    }, {} as Record<string, { credenciado: string; pontuacoes: number[] }>);

    return Object.values(grouped)
      .map(g => ({
        credenciado: g.credenciado,
        pontuacao_geral: g.pontuacoes.reduce((a, b) => a + b, 0) / g.pontuacoes.length
      }))
      .sort((a, b) => a.pontuacao_geral - b.pontuacao_geral)
      .slice(0, 10);
  }, [dadosFiltrados]);

  // Distribuição de notas
  const distribuicao = useMemo(() => {
    const faixas = [
      { nome: "0-1", min: 0, max: 1, count: 0 },
      { nome: "1-2", min: 1, max: 2, count: 0 },
      { nome: "2-3", min: 2, max: 3, count: 0 },
      { nome: "3-4", min: 3, max: 4, count: 0 },
      { nome: "4-5", min: 4, max: 5.1, count: 0 },
    ];

    dadosFiltrados.forEach(av => {
      const faixa = faixas.find(f => av.pontuacao >= f.min && av.pontuacao < f.max);
      if (faixa) faixa.count++;
    });

    return faixas;
  }, [dadosFiltrados]);

  // Evolução temporal
  const evolucao = useMemo(() => {
    const agrupado: Record<string, { total: number; count: number }> = {};
    dadosFiltrados.forEach(av => {
      const mes = format(new Date(av.data), "MMM/yy", { locale: ptBR });
      if (!agrupado[mes]) agrupado[mes] = { total: 0, count: 0 };
      agrupado[mes].total += av.pontuacao;
      agrupado[mes].count += 1;
    });

    return Object.entries(agrupado).map(([mes, { total, count }]) => ({
      mes,
      media: total / count,
    }));
  }, [dadosFiltrados]);

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  // Funções de exportação
  const handleExportExcel = () => {
    const dadosExport = dadosFiltrados.map(av => ({
      'Data': format(new Date(av.data), 'dd/MM/yyyy'),
      'Credenciado': av.credenciado,
      'Médico': av.medico,
      'Especialidade': av.especialidade,
      'Categoria': av.categoria,
      'Pontuação': av.pontuacao,
      'Comentário': av.comentario
    }));
    DataExporter.exportarParaExcel(dadosExport, 'avaliacoes', 'Avaliações');
  };

  const handleExportPDF = () => {
    const dadosExport = dadosFiltrados.map(av => ({
      data: format(new Date(av.data), 'dd/MM/yyyy'),
      credenciado: av.credenciado,
      medico: av.medico,
      especialidade: av.especialidade,
      pontuacao: av.pontuacao
    }));
    DataExporter.exportarParaPDF(
      dadosExport,
      [
        { header: 'Data', dataKey: 'data' },
        { header: 'Credenciado', dataKey: 'credenciado' },
        { header: 'Médico', dataKey: 'medico' },
        { header: 'Especialidade', dataKey: 'especialidade' },
        { header: 'Pontuação', dataKey: 'pontuacao' },
      ],
      'Relatório de Avaliações',
      'relatorio_avaliacoes'
    );
  };

  const handleExportCSV = () => {
    const dadosExport = dadosFiltrados.map(av => ({
      'Data': format(new Date(av.data), 'dd/MM/yyyy'),
      'Credenciado': av.credenciado,
      'Médico': av.medico,
      'Especialidade': av.especialidade,
      'Categoria': av.categoria,
      'Pontuação': av.pontuacao,
      'Comentário': av.comentario
    }));
    DataExporter.exportarParaCSV(dadosExport, 'avaliacoes');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatório de Avaliações</h1>
          <p className="text-muted-foreground">Análise de desempenho dos credenciados ({dadosFiltrados.length} avaliações filtradas)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportExcel} variant="outline" size="sm">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={handleExportPDF} variant="outline" size="sm">
            <FileText className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
              <label className="text-sm font-medium mb-2 block">Credenciado</label>
              <Select value={credenciadoFiltro} onValueChange={setCredenciadoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {credenciadosUnicos.map(cred => (
                    <SelectItem key={cred} value={cred}>{cred}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Médico</label>
              <Select value={medicoFiltro} onValueChange={setMedicoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {medicosUnicos.map(med => (
                    <SelectItem key={med} value={med}>{med}</SelectItem>
                  ))}
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
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Especialidade</label>
              <Select value={especialidade} onValueChange={setEspecialidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Cardiologia">Cardiologia</SelectItem>
                  <SelectItem value="Pediatria">Pediatria</SelectItem>
                  <SelectItem value="Ortopedia">Ortopedia</SelectItem>
                  <SelectItem value="Ginecologia">Ginecologia</SelectItem>
                  <SelectItem value="Dermatologia">Dermatologia</SelectItem>
                  <SelectItem value="Neurologia">Neurologia</SelectItem>
                  <SelectItem value="Oftalmologia">Oftalmologia</SelectItem>
                </SelectContent>
              </Select>
            </div>
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

        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução Temporal
            </CardTitle>
            <CardDescription>Tendência de avaliações ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={evolucao || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMedia" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis 
                  dataKey="mes" 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  tickLine={false}
                />
                <YAxis 
                  domain={[0, 5]} 
                  stroke="hsl(var(--muted-foreground))"
                  style={{ fontSize: '12px' }}
                  tickLine={false}
                  ticks={[0, 1, 2, 3, 4, 5]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${value.toFixed(2)} ⭐`, 'Média']}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Area 
                  type="monotone" 
                  dataKey="media" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fill="url(#colorMedia)"
                  name="Média de Avaliações"
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  dot={{ 
                    fill: 'hsl(var(--primary))', 
                    strokeWidth: 2, 
                    r: 5,
                    stroke: 'hsl(var(--background))'
                  }}
                  activeDot={{ 
                    r: 8,
                    fill: 'hsl(var(--primary))',
                    stroke: 'hsl(var(--background))',
                    strokeWidth: 3
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela com Todos os Dados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Todas as Avaliações</CardTitle>
              <CardDescription>Dados completos das avaliações filtradas ({dadosFiltrados.length} registros)</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleExportExcel} variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
              <Button onClick={handleExportPDF} variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                PDF
              </Button>
              <Button onClick={handleExportCSV} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Credenciado</TableHead>
                  <TableHead>Médico</TableHead>
                  <TableHead>Especialidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Pontuação</TableHead>
                  <TableHead>Comentário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma avaliação encontrada com os filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  dadosFiltrados.map((av) => (
                    <TableRow key={av.id}>
                      <TableCell>{format(new Date(av.data), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">{av.credenciado}</TableCell>
                      <TableCell>{av.medico}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{av.especialidade}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{av.categoria}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={av.pontuacao >= 4.5 ? "default" : av.pontuacao >= 3.5 ? "secondary" : "destructive"}
                          className={av.pontuacao >= 4.5 ? "bg-green-500" : ""}
                        >
                          {av.pontuacao.toFixed(1)} ⭐
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{av.comentario}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
                    <TableRow key={index}>
                      <TableCell className="font-bold">{index + 1}</TableCell>
                      <TableCell>{item.credenciado}</TableCell>
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
                    <TableRow key={index}>
                      <TableCell className="font-bold">{index + 1}</TableCell>
                      <TableCell>{item.credenciado}</TableCell>
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
