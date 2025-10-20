import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useDadosCredenciamentos } from '@/hooks/useDashboardData';
import { DataExporter } from '@/utils/exportData';

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function DashboardCredenciamentos() {
  const { data: dados, isLoading } = useDadosCredenciamentos();

  if (isLoading) {
    return <div className="text-center py-12">Carregando dashboard...</div>;
  }

  if (!dados) {
    return <div className="text-center py-12">Sem dados disponíveis</div>;
  }

  const exportarExcel = () => {
    const dadosExport = dados.porEspecialidade.map(e => ({
      'Especialidade': e.especialidade,
      'Total': e.total,
      'Ativos': e.ativos,
      'Pendentes': e.pendentes
    }));
    DataExporter.exportarParaExcel(dadosExport, 'credenciamentos_por_especialidade', 'Especialidades');
  };

  const exportarPDF = () => {
    DataExporter.exportarParaPDF(
      dados.porEspecialidade,
      [
        { header: 'Especialidade', dataKey: 'especialidade' },
        { header: 'Total', dataKey: 'total' },
        { header: 'Ativos', dataKey: 'ativos' },
        { header: 'Pendentes', dataKey: 'pendentes' }
      ],
      'Relatório de Credenciamentos por Especialidade',
      'credenciamentos_especialidade'
    );
  };

  const exportarCSV = () => {
    const dadosExport = dados.porEspecialidade.map(e => ({
      'Especialidade': e.especialidade,
      'Total': e.total,
      'Ativos': e.ativos,
      'Pendentes': e.pendentes
    }));
    DataExporter.exportarParaCSV(dadosExport, 'credenciamentos_especialidade');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard de Credenciamentos</h1>
        <div className="flex gap-2">
          <Button onClick={exportarExcel} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button onClick={exportarPDF} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button onClick={exportarCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Credenciados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dados.totais.ativos + dados.totais.pendentes + dados.totais.inativos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{dados.totais.ativos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{dados.totais.pendentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{dados.totais.inativos}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Credenciamentos por Especialidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="grafico-especialidades" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dados.porEspecialidade}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="especialidade" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    fontSize={12}
                    stroke="hsl(var(--foreground))"
                  />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="ativos" fill="#10b981" name="Ativos" />
                  <Bar dataKey="pendentes" fill="#f59e0b" name="Pendentes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Região</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="grafico-regioes" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dados.porRegiao}
                    dataKey="total"
                    nameKey="regiao"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.regiao}: ${entry.percentual}%`}
                  >
                    {dados.porRegiao.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolução dos Credenciamentos (Últimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div id="grafico-evolucao" className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dados.evoluaoTemporal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="data" stroke="hsl(var(--foreground))" />
                  <YAxis stroke="hsl(var(--foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="credenciamentos" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Novos Credenciamentos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="renovacoes" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Renovações"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Especialidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Especialidade</th>
                  <th className="text-right py-3 px-4 font-medium">Total</th>
                  <th className="text-right py-3 px-4 font-medium">Ativos</th>
                  <th className="text-right py-3 px-4 font-medium">Pendentes</th>
                  <th className="text-right py-3 px-4 font-medium">% Ativo</th>
                </tr>
              </thead>
              <tbody>
                {dados.porEspecialidade.map((esp, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{esp.especialidade}</td>
                    <td className="text-right py-3 px-4">{esp.total}</td>
                    <td className="text-right py-3 px-4 text-green-600 font-medium">
                      {esp.ativos}
                    </td>
                    <td className="text-right py-3 px-4 text-yellow-600">
                      {esp.pendentes}
                    </td>
                    <td className="text-right py-3 px-4">
                      {Math.round((esp.ativos / esp.total) * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
