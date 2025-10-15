import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePrazos } from "@/hooks/usePrazos";
import { ModalRenovarPrazo } from "@/components/prazos/ModalRenovarPrazo";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  FileText,
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
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
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
            <CheckCircle className="w-12 h-12 text-green-500 opacity-30" />
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
            <AlertCircle className="w-12 h-12 text-yellow-500 opacity-30" />
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
            <XCircle className="w-12 h-12 text-red-500 opacity-30" />
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
          Todos
        </Button>
        <Button
          variant={filtro === 'criticos' ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setFiltro('criticos')}
        >
          Críticos ({dashboard?.criticos || 0})
        </Button>
        <Button
          variant={filtro === 'vencendo' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFiltro('vencendo')}
        >
          Vencendo ({dashboard?.total_vencendo || 0})
        </Button>
        <Button
          variant={filtro === 'vencidos' ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => setFiltro('vencidos')}
        >
          Vencidos ({dashboard?.total_vencidos || 0})
        </Button>
      </div>

      {/* Lista de Prazos */}
      <Card>
        <div className="divide-y">
          {prazosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum prazo encontrado</p>
            </div>
          ) : (
            prazosFiltrados.map((prazo) => (
              <div key={prazo.id} className="p-4 hover:bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: prazo.cor_status }}
                      >
                        {prazo.dias_para_vencer < 0 
                          ? Math.abs(prazo.dias_para_vencer)
                          : prazo.dias_para_vencer}
                      </div>
                      <span className="text-xs text-muted-foreground mt-1">
                        {prazo.dias_para_vencer < 0 ? 'dias atrás' : 'dias'}
                      </span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{prazo.entidade_nome}</h4>
                        <Badge variant="outline">{prazo.entidade_tipo}</Badge>
                        <Badge
                          style={{
                            backgroundColor: prazo.cor_status + '20',
                            color: prazo.cor_status,
                            borderColor: prazo.cor_status
                          }}
                        >
                          {prazo.nivel_alerta}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground">
                        <p>{prazo.credenciado_nome}</p>
                        <p>
                          Vencimento: {format(new Date(prazo.data_vencimento), 'dd/MM/yyyy')}
                          {prazo.dias_para_vencer < 0 && (
                            <span className="text-red-600 font-medium ml-2">
                              (VENCIDO)
                            </span>
                          )}
                        </p>
                      </div>

                      {prazo.dias_para_vencer >= 0 && (
                        <div className="mt-2">
                          <Progress
                            value={Math.max(0, 100 - (prazo.dias_para_vencer / 30) * 100)}
                            className="h-2"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {prazo.renovavel && (
                      <Button
                        size="sm"
                        onClick={() => handleRenovar(prazo)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Renovar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <ModalRenovarPrazo
        prazo={prazoSelecionado}
        open={modalRenovarOpen}
        onClose={() => setModalRenovarOpen(false)}
        onConfirm={handleConfirmarRenovacao}
      />
    </div>
  );
}