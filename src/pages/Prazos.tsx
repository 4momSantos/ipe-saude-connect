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
import type { Prazo } from '@/hooks/usePrazos';

const CORES = {
  valido: '#10b981',
  vencendo: '#eab308',
  vencido: '#ef4444',
  critico: '#f97316',
  atencao: '#f59e0b'
};

type FiltroStatus = 'todos' | 'criticos' | 'vencendo' | 'vencidos';

export default function Prazos() {
  const { dashboard, prazos, isLoading, atualizarAgora, renovarPrazo } = usePrazos();
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [prazoSelecionado, setPrazoSelecionado] = useState<Prazo | null>(null);
  const [modalRenovarOpen, setModalRenovarOpen] = useState(false);

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

  const prazosFiltrados = prazos.filter(p => {
    if (filtro === 'criticos') return p.nivel_alerta === 'critico';
    if (filtro === 'vencendo') return p.nivel_alerta === 'vencendo' || p.nivel_alerta === 'atencao';
    if (filtro === 'vencidos') return p.status_atual === 'vencido';
    return true;
  });

  const dadosPizza = dashboard ? [
    { name: 'Válidos', value: dashboard.total_validos, color: CORES.valido },
    { name: 'Vencendo', value: dashboard.total_vencendo, color: CORES.vencendo },
    { name: 'Vencidos', value: dashboard.total_vencidos, color: CORES.vencido }
  ] : [];

  const dadosBarras = dashboard ? [
    { periodo: '7 dias', quantidade: dashboard.vencem_7_dias },
    { periodo: '15 dias', quantidade: dashboard.vencem_15_dias },
    { periodo: '30 dias', quantidade: dashboard.vencem_30_dias }
  ] : [];

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
                  <p className="text-sm text-muted-foreground">Total de Prazos</p>
                  <p className="text-3xl font-bold mt-2">{dashboard?.total_prazos || 0}</p>
                </div>
                <FileText className="w-12 h-12 text-blue-500 opacity-20" />
              </div>
            </Card>

            <Card className="p-6 border-green-200 bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Válidos</p>
                  <p className="text-3xl font-bold mt-2 text-green-600">
                    {dashboard?.total_validos || 0}
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
                    {dashboard?.total_vencendo || 0}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    {dashboard?.criticos || 0} críticos
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
                    {dashboard?.total_vencidos || 0}
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
              <h3 className="font-semibold mb-4">Vencimentos Próximos</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dadosBarras}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="periodo" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex gap-2">
            <Button
              variant={filtro === 'todos' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltro('todos')}
            >
              Todos ({prazos?.length || 0})
            </Button>
            <Button
              variant={filtro === 'criticos' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFiltro('criticos')}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Críticos ({dashboard?.criticos || 0})
            </Button>
            <Button
              variant={filtro === 'vencendo' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFiltro('vencendo')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Vencendo ({dashboard?.total_vencendo || 0})
            </Button>
            <Button
              variant={filtro === 'vencidos' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => setFiltro('vencidos')}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Vencidos ({dashboard?.total_vencidos || 0})
            </Button>
          </div>

          {/* Grid de Prazos */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prazosFiltrados.length === 0 ? (
              <Card className="col-span-full p-8">
                <div className="text-center text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhum prazo encontrado</p>
                </div>
              </Card>
            ) : (
              prazosFiltrados.map((prazo) => {
                const nivelAlertaTexto = prazo.nivel_alerta === 'critico' ? 'Crítico' :
                  prazo.nivel_alerta === 'vencendo' ? 'Vencendo' :
                  prazo.nivel_alerta === 'atencao' ? 'Atenção' : 'Normal';

                return (
                  <Card key={prazo.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg" 
                            style={{ backgroundColor: prazo.cor_status + '20' }}
                          >
                            <CalendarDays 
                              className="h-5 w-5" 
                              style={{ color: prazo.cor_status }}
                            />
                          </div>
                          <div>
                            <CardTitle className="text-base">{prazo.credenciado_nome}</CardTitle>
                            <CardDescription className="text-xs">
                              {prazo.entidade_nome || 'Prazo'}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge 
                          variant="outline"
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

                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Vencimento:</span>
                          <span className="font-medium">
                            {format(new Date(prazo.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        
                        {prazo.dias_para_vencer !== null && (
                          <div className={`text-sm font-medium ${
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
                          className="h-2"
                        />
                      </div>

                      {prazo.renovavel && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => handleRenovar(prazo)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Renovar
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Aba: Documentos de Credenciados */}
        <TabsContent value="documentos" className="mt-6">
          <DocumentosCredenciadosTab />
        </TabsContent>

        {/* Aba: Críticos */}
        <TabsContent value="criticos" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {prazosFiltrados
              .filter(p => p.nivel_alerta === 'critico' || p.status_atual === 'vencido')
              .length === 0 ? (
              <Card className="col-span-full p-8">
                <div className="text-center text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-300" />
                  <p>Nenhum prazo crítico! 🎉</p>
                </div>
              </Card>
            ) : (
              prazosFiltrados
                .filter(p => p.nivel_alerta === 'critico' || p.status_atual === 'vencido')
                .map((prazo) => {
                  const nivelAlertaTexto = prazo.nivel_alerta === 'critico' ? 'Crítico' : 'Vencido';

                  return (
                    <Card key={prazo.id} className="border-red-500 hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-100">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{prazo.credenciado_nome}</CardTitle>
                              <CardDescription className="text-xs">
                                {prazo.entidade_nome || 'Prazo'}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="destructive">
                            {nivelAlertaTexto}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Vencimento:</span>
                            <span className="font-medium">
                              {format(new Date(prazo.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          </div>
                          
                          {prazo.dias_para_vencer !== null && (
                            <div className="text-sm font-medium text-red-600">
                              {prazo.dias_para_vencer < 0 
                                ? `Vencido há ${Math.abs(prazo.dias_para_vencer)} dias`
                                : `Vence em ${prazo.dias_para_vencer} dias`
                              }
                            </div>
                          )}
                        </div>

                        {prazo.renovavel && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="w-full"
                            onClick={() => handleRenovar(prazo)}
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Renovar Urgente
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
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
