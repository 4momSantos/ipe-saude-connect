import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDadosRelatorioDocumentos } from '@/hooks/useDashboardData';
import { DataExporter } from '@/utils/exportData';

const CORES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export function RelatorioDocumentos() {
  const { data: dados, isLoading } = useDadosRelatorioDocumentos();

  if (isLoading) return <div className="text-center py-12">Carregando...</div>;
  if (!dados) return <div className="text-center py-12">Sem dados</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Relatório de Documentos</h1>
        <div className="flex gap-2">
          <Button onClick={() => DataExporter.exportarParaExcel(dados.porTipo, 'relatorio_documentos')} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(dados.resumo).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{key}</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Por Tipo</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.porTipo}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tipo" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="aprovados" fill="#10b981" name="Aprovados" />
                <Bar dataKey="rejeitados" fill="#ef4444" name="Rejeitados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
