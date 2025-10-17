import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePrazos } from "@/hooks/usePrazos";
import { ModalRenovarPrazo } from "@/components/prazos/ModalRenovarPrazo";
import { DocumentosCredenciadosTab } from "@/components/prazos/DocumentosCredenciadosTab";
import { ControlePrazosAgrupado } from "@/components/prazos/ControlePrazosAgrupado";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  FileText,
  FolderOpen,
  CalendarDays,
  Clock
} from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { Prazo, CredenciadoPrazos } from '@/hooks/usePrazos';

const CORES = {
  valido: '#10b981',
  vencendo: '#eab308',
  vencido: '#ef4444',
  critico: '#f97316',
  atencao: '#f59e0b'
};

type FiltroStatus = 'todos' | 'criticos' | 'vencendo' | 'vencidos';

type TipoAgrupamento = 'credenciado' | 'tipo' | 'nenhum';

export default function Prazos() {
  const { dashboard, prazosAgrupados, isLoading, atualizarAgora, renovarPrazo } = usePrazos();
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [prazoSelecionado, setPrazoSelecionado] = useState<Prazo | null>(null);
  const [modalRenovarOpen, setModalRenovarOpen] = useState(false);
  const [agrupamento, setAgrupamento] = useState<TipoAgrupamento>('credenciado');

  const handleRenovar = (prazo: Prazo) => {
    setPrazoSelecionado(prazo);
    setModalRenovarOpen(true);
  };

  const handleConfirmarRenovacao = (novaData: string, observacao: string) => {
    if (!prazoSelecionado) return;
    
    renovarPrazo.mutate({
      prazoId: prazoSelecionado.id,
      novaData,
      observacao
    });
  };

  const credenciadosFiltrados = prazosAgrupados.filter(cred => {
    if (filtro === 'criticos') return cred.documentos_criticos > 0;
    if (filtro === 'vencendo') return cred.documentos_vencendo > 0;
    if (filtro === 'vencidos') return cred.documentos_vencidos > 0;
    return true;
  });

  // Calcular totais agregados
  const totalDocumentos = prazosAgrupados.reduce((acc, cred) => acc + cred.total_documentos, 0);
  const totalValidos = prazosAgrupados.reduce((acc, cred) => acc + cred.documentos_validos, 0);
  const totalVencendo = prazosAgrupados.reduce((acc, cred) => acc + cred.documentos_vencendo, 0);
  const totalVencidos = prazosAgrupados.reduce((acc, cred) => acc + cred.documentos_vencidos, 0);
  const totalCriticos = prazosAgrupados.reduce((acc, cred) => acc + cred.documentos_criticos, 0);

  const dadosPizza = [
    { name: 'Válidos', value: totalValidos, color: CORES.valido },
    { name: 'Vencendo', value: totalVencendo, color: CORES.vencendo },
    { name: 'Vencidos', value: totalVencidos, color: CORES.vencido }
  ];

  // Dados por credenciado para o gráfico de barras
  const dadosBarras = credenciadosFiltrados.slice(0, 10).map(cred => ({
    credenciado: cred.credenciado_nome.length > 20 
      ? cred.credenciado_nome.substring(0, 20) + '...' 
      : cred.credenciado_nome,
    validos: cred.documentos_validos,
    vencendo: cred.documentos_vencendo,
    vencidos: cred.documentos_vencidos
  }));

  if (isLoading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Controle de Prazos</h1>
          <p className="text-muted-foreground mt-1">
            Monitore vencimentos de documentos e certificados
          </p>
        </div>
        <Button 
          onClick={() => atualizarAgora.mutate()} 
          disabled={atualizarAgora.isPending}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${atualizarAgora.isPending ? 'animate-spin' : ''}`} />
          Atualizar Agora
        </Button>
      </div>

      {/* Tabs Principal */}
      <Tabs defaultValue="agrupado" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="agrupado">
            <FolderOpen className="h-4 w-4 mr-2" />
            Por Credenciado
          </TabsTrigger>
          <TabsTrigger value="todos">
            <FileText className="h-4 w-4 mr-2" />
            Todos os Prazos
          </TabsTrigger>
          <TabsTrigger value="documentos">
            <FolderOpen className="h-4 w-4 mr-2" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="criticos">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Críticos
          </TabsTrigger>
        </TabsList>

        {/* Aba: Por Credenciado */}
        <TabsContent value="agrupado" className="mt-6">
          <ControlePrazosAgrupado />
        </TabsContent>

        {/* Aba: Todos os Prazos */}
        <TabsContent value="todos" className="space-y-6 mt-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Documentos</p>
                  <p className="text-3xl font-bold mt-2">{totalDocumentos}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {prazosAgrupados.length} credenciados
                  </p>
                </div>
                <FileText className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 border-green-200 bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Válidos</p>
                  <p className="text-3xl font-bold mt-2 text-green-600">
                    {totalValidos}
                  </p>
                </div>
                <CheckCircle2 className="w-12 h-12 text-green-500 opacity-30" />
              </div>
            </Card>

            <Card className="p-6 border-yellow-200 bg-yellow-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-700">Vencendo</p>
                  <p className="text-3xl font-bold mt-2 text-yellow-600">
                    {totalVencendo}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {totalCriticos} críticos
                  </p>
                </div>
                <Clock className="w-12 h-12 text-yellow-500 opacity-30" />
              </div>
            </Card>

            <Card className="p-6 border-red-200 bg-red-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-700">Vencidos</p>
                  <p className="text-3xl font-bold mt-2 text-red-600">
                    {totalVencidos}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    ⚠️ Requer ação imediata
                  </p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-500 opacity-30" />
              </div>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Distribuição por Status</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dadosPizza}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {dadosPizza.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Top 10 Credenciados - Status dos Documentos</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dadosBarras}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="credenciado" angle={-45} textAnchor="end" height={80} fontSize={11} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="validos" fill={CORES.valido} name="Válidos" />
                  <Bar dataKey="vencendo" fill={CORES.vencendo} name="Vencendo" />
                  <Bar dataKey="vencidos" fill={CORES.vencido} name="Vencidos" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Filtros e Agrupamento */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filtro === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltro('todos')}
              >
                Todos ({prazosAgrupados.length} credenciados)
              </Button>
              <Button
                variant={filtro === 'criticos' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFiltro('criticos')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Críticos ({totalCriticos})
              </Button>
              <Button
                variant={filtro === 'vencendo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltro('vencendo')}
              >
                <Clock className="h-4 w-4 mr-2" />
                Vencendo ({totalVencendo})
              </Button>
              <Button
                variant={filtro === 'vencidos' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFiltro('vencidos')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Vencidos ({totalVencidos})
              </Button>
            </div>

            {/* Controles de Agrupamento */}
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground">Agrupar:</span>
              <Button
                variant={agrupamento === 'credenciado' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAgrupamento('credenciado')}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Por Credenciado
              </Button>
              <Button
                variant={agrupamento === 'tipo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAgrupamento('tipo')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Por Tipo
              </Button>
              <Button
                variant={agrupamento === 'nenhum' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAgrupamento('nenhum')}
              >
                <CalendarDays className="h-4 w-4 mr-2" />
                Lista Simples
              </Button>
            </div>
          </div>

          {/* Renderização baseada no agrupamento */}
          <div className="space-y-4">
            {credenciadosFiltrados.length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum credenciado encontrado</p>
                </div>
              </Card>
            ) : agrupamento === 'credenciado' ? (
              // Agrupado por Credenciado (visualização original)
              credenciadosFiltrados.map((credenciado) => (
                <Card key={credenciado.credenciado_id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-bold">{credenciado.credenciado_nome}</CardTitle>
                        <CardDescription className="text-primary-foreground/90 text-sm mt-1">
                          {credenciado.credenciado_numero}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-white/20">
                          {credenciado.total_documentos} docs
                        </Badge>
                        {credenciado.documentos_vencidos > 0 && (
                          <Badge variant="destructive">
                            {credenciado.documentos_vencidos} vencidos
                          </Badge>
                        )}
                        {credenciado.documentos_criticos > 0 && (
                          <Badge className="bg-orange-500">
                            {credenciado.documentos_criticos} críticos
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {credenciado.prazos.map((prazo) => {
                        const nivelAlertaTexto = prazo.nivel_alerta === 'critico' ? 'Crítico' :
                          prazo.nivel_alerta === 'vencendo' ? 'Vencendo' :
                          prazo.nivel_alerta === 'atencao' ? 'Atenção' : 'Válido';

                        return (
                          <Card
                            key={prazo.id}
                            className="border hover:shadow-md transition-all"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div 
                                    className="p-2 rounded-lg flex-shrink-0" 
                                    style={{ backgroundColor: prazo.cor_status + '20' }}
                                  >
                                    <FileText 
                                      className="h-4 w-4" 
                                      style={{ color: prazo.cor_status }}
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm truncate">{prazo.entidade_nome}</p>
                                  </div>
                                </div>
                                <Badge 
                                  variant="outline"
                                  className="text-xs flex-shrink-0"
                                  style={{
                                    backgroundColor: prazo.cor_status + '20',
                                    color: prazo.cor_status,
                                    borderColor: prazo.cor_status
                                  }}
                                >
                                  {nivelAlertaTexto}
                                </Badge>
                              </div>
                            </CardHeader>

                            <CardContent className="space-y-3 pt-0">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Vencimento:</span>
                                  <span className="font-medium">
                                    {format(new Date(prazo.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                                  </span>
                                </div>
                                
                                {prazo.dias_para_vencer !== null && (
                                  <div className={`text-xs font-medium ${
                                    prazo.dias_para_vencer < 0 ? 'text-red-600' :
                                    prazo.dias_para_vencer <= 7 ? 'text-orange-600' :
                                    prazo.dias_para_vencer <= 30 ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    {prazo.dias_para_vencer < 0 
                                      ? `Vencido há ${Math.abs(prazo.dias_para_vencer)} dias`
                                      : `${prazo.dias_para_vencer} dias restantes`
                                    }
                                  </div>
                                )}

                                <Progress 
                                  value={prazo.dias_para_vencer < 0 ? 0 : Math.min((prazo.dias_para_vencer / 90) * 100, 100)} 
                                  className="h-1.5"
                                />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : agrupamento === 'tipo' ? (
              // Agrupado por Tipo de Documento
              (() => {
                const prazosFlat = credenciadosFiltrados.flatMap(c => 
                  c.prazos.map(p => ({ ...p, credenciado: c }))
                );
                const gruposPorTipo = prazosFlat.reduce((acc, prazo) => {
                  const tipo = prazo.entidade_tipo || 'Outros';
                  if (!acc[tipo]) acc[tipo] = [];
                  acc[tipo].push(prazo);
                  return acc;
                }, {} as Record<string, typeof prazosFlat>);

                return Object.entries(gruposPorTipo).map(([tipo, prazos]) => (
                  <Card key={tipo} className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        {tipo}
                        <Badge variant="secondary" className="ml-auto bg-white/20">
                          {prazos.length} documentos
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {prazos.map((prazo) => {
                          const nivelAlertaTexto = prazo.nivel_alerta === 'critico' ? 'Crítico' :
                            prazo.nivel_alerta === 'vencendo' ? 'Vencendo' :
                            prazo.nivel_alerta === 'atencao' ? 'Atenção' : 'Válido';

                          return (
                            <Card key={prazo.id} className="border hover:shadow-md transition-all">
                              <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div 
                                      className="p-2 rounded-lg flex-shrink-0" 
                                      style={{ backgroundColor: prazo.cor_status + '20' }}
                                    >
                                      <FileText 
                                        className="h-4 w-4" 
                                        style={{ color: prazo.cor_status }}
                                      />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-sm truncate">{prazo.entidade_nome}</p>
                                      <p className="text-xs text-muted-foreground truncate">
                                        {prazo.credenciado.credenciado_nome}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge 
                                    variant="outline"
                                    className="text-xs flex-shrink-0"
                                    style={{
                                      backgroundColor: prazo.cor_status + '20',
                                      color: prazo.cor_status,
                                      borderColor: prazo.cor_status
                                    }}
                                  >
                                    {nivelAlertaTexto}
                                  </Badge>
                                </div>
                              </CardHeader>
                              <CardContent className="space-y-3 pt-0">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Vencimento:</span>
                                    <span className="font-medium">
                                      {format(new Date(prazo.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  </div>
                                  {prazo.dias_para_vencer !== null && (
                                    <div className={`text-xs font-medium ${
                                      prazo.dias_para_vencer < 0 ? 'text-red-600' :
                                      prazo.dias_para_vencer <= 7 ? 'text-orange-600' :
                                      prazo.dias_para_vencer <= 30 ? 'text-yellow-600' :
                                      'text-green-600'
                                    }`}>
                                      {prazo.dias_para_vencer < 0 
                                        ? `Vencido há ${Math.abs(prazo.dias_para_vencer)} dias`
                                        : `${prazo.dias_para_vencer} dias restantes`
                                      }
                                    </div>
                                  )}
                                  <Progress 
                                    value={prazo.dias_para_vencer < 0 ? 0 : Math.min((prazo.dias_para_vencer / 90) * 100, 100)} 
                                    className="h-1.5"
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ));
              })()
            ) : (
              // Lista Simples (sem agrupamento)
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {credenciadosFiltrados.flatMap(credenciado =>
                  credenciado.prazos.map((prazo) => {
                    const nivelAlertaTexto = prazo.nivel_alerta === 'critico' ? 'Crítico' :
                      prazo.nivel_alerta === 'vencendo' ? 'Vencendo' :
                      prazo.nivel_alerta === 'atencao' ? 'Atenção' : 'Válido';

                    return (
                      <Card key={prazo.id} className="border hover:shadow-md transition-all">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div 
                                className="p-2 rounded-lg flex-shrink-0" 
                                style={{ backgroundColor: prazo.cor_status + '20' }}
                              >
                                <FileText 
                                  className="h-4 w-4" 
                                  style={{ color: prazo.cor_status }}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{prazo.entidade_nome}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {credenciado.credenciado_nome}
                                </p>
                              </div>
                            </div>
                            <Badge 
                              variant="outline"
                              className="text-xs flex-shrink-0"
                              style={{
                                backgroundColor: prazo.cor_status + '20',
                                color: prazo.cor_status,
                                borderColor: prazo.cor_status
                              }}
                            >
                              {nivelAlertaTexto}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Vencimento:</span>
                              <span className="font-medium">
                                {format(new Date(prazo.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                              </span>
                            </div>
                            {prazo.dias_para_vencer !== null && (
                              <div className={`text-xs font-medium ${
                                prazo.dias_para_vencer < 0 ? 'text-red-600' :
                                prazo.dias_para_vencer <= 7 ? 'text-orange-600' :
                                prazo.dias_para_vencer <= 30 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {prazo.dias_para_vencer < 0 
                                  ? `Vencido há ${Math.abs(prazo.dias_para_vencer)} dias`
                                  : `${prazo.dias_para_vencer} dias restantes`
                                }
                              </div>
                            )}
                            <Progress 
                              value={prazo.dias_para_vencer < 0 ? 0 : Math.min((prazo.dias_para_vencer / 90) * 100, 100)} 
                              className="h-1.5"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Aba: Documentos de Credenciados */}
        <TabsContent value="documentos" className="mt-6">
          <DocumentosCredenciadosTab />
        </TabsContent>

        {/* Aba: Críticos */}
        <TabsContent value="criticos" className="space-y-6 mt-6">
          <div className="space-y-4">
            {credenciadosFiltrados
              .filter(c => c.documentos_criticos > 0 || c.documentos_vencidos > 0)
              .length === 0 ? (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-300" />
                  <p>Nenhum prazo crítico! 🎉</p>
                </div>
              </Card>
            ) : (
              credenciadosFiltrados
                .filter(c => c.documentos_criticos > 0 || c.documentos_vencidos > 0)
                .map((credenciado) => (
                  <Card key={credenciado.credenciado_id} className="border-red-300 overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-red-600 to-red-700 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{credenciado.credenciado_nome}</CardTitle>
                          <CardDescription className="text-red-100">
                            CPF: {credenciado.credenciado_cpf}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          {credenciado.documentos_vencidos > 0 && (
                            <Badge variant="destructive" className="bg-red-900">
                              {credenciado.documentos_vencidos} vencidos
                            </Badge>
                          )}
                          {credenciado.documentos_criticos > 0 && (
                            <Badge className="bg-orange-600">
                              {credenciado.documentos_criticos} críticos
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4">
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {credenciado.prazos
                          .filter(p => p.nivel_alerta === 'critico' || p.status_atual === 'vencido')
                          .map((prazo) => {
                            const nivelAlertaTexto = prazo.nivel_alerta === 'critico' ? 'Crítico' : 'Vencido';

                            return (
                              <div
                                key={prazo.id}
                                className="border-2 border-red-300 rounded-lg p-4 bg-red-50"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-red-200">
                                      <AlertTriangle className="h-4 w-4 text-red-700" />
                                    </div>
                                    <div>
                                      <p className="font-medium text-sm">{prazo.entidade_nome}</p>
                                    </div>
                                  </div>
                                  <Badge variant="destructive" className="text-xs">
                                    {nivelAlertaTexto}
                                  </Badge>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Vencimento:</span>
                                    <span className="font-medium text-red-700">
                                      {format(new Date(prazo.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                                    </span>
                                  </div>
                                  
                                  {prazo.dias_para_vencer !== null && (
                                    <div className="text-xs font-semibold text-red-700">
                                      {prazo.dias_para_vencer < 0 
                                        ? `⚠️ Vencido há ${Math.abs(prazo.dias_para_vencer)} dias`
                                        : `⚠️ Vence em ${prazo.dias_para_vencer} dias`
                                      }
                                    </div>
                                  )}

                                  {prazo.renovavel && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="w-full mt-2"
                                      onClick={() => handleRenovar(prazo)}
                                    >
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Renovar Urgente
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ModalRenovarPrazo
        prazo={prazoSelecionado}
        open={modalRenovarOpen}
        onClose={() => setModalRenovarOpen(false)}
        onConfirm={handleConfirmarRenovacao}
      />
    </div>
  );
}
