import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useDadosPrazos } from '@/hooks/useDashboardData';
import { DataExporter } from '@/utils/exportData';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function DashboardPrazosValidades() {
  const { data: dados, isLoading } = useDadosPrazos();

  if (isLoading) {
    return <div className="text-center py-12">Carregando dashboard...</div>;
  }

  if (!dados) {
    return <div className="text-center py-12">Sem dados disponíveis</div>;
  }

  const exportarExcel = () => {
    const dadosExport = dados.documentosVencendo.map(d => ({
      'Credenciado': d.credenciado,
      'CPF': d.cpf,
      'Tipo Documento': d.tipoDocumento,
      'Número': d.numeroDocumento,
      'Vencimento': format(d.dataVencimento, 'dd/MM/yyyy', { locale: ptBR }),
      'Dias para Vencer': d.diasParaVencer,
      'Status': d.status
    }));
    DataExporter.exportarParaExcel(dadosExport, 'documentos_vencendo', 'Documentos');
  };

  const exportarPDF = () => {
    DataExporter.exportarParaPDF(
      dados.documentosVencendo.map(d => ({
        ...d,
        dataVencimento: format(d.dataVencimento, 'dd/MM/yyyy', { locale: ptBR })
      })),
      [
        { header: 'Credenciado', dataKey: 'credenciado' },
        { header: 'Tipo', dataKey: 'tipoDocumento' },
        { header: 'Vencimento', dataKey: 'dataVencimento' },
        { header: 'Dias', dataKey: 'diasParaVencer' },
        { header: 'Status', dataKey: 'status' }
      ],
      'Relatório de Prazos e Validades',
      'prazos_validades'
    );
  };

  const exportarCSV = () => {
    const dadosExport = dados.documentosVencendo.map(d => ({
      'Credenciado': d.credenciado,
      'CPF': d.cpf,
      'Tipo Documento': d.tipoDocumento,
      'Vencimento': format(d.dataVencimento, 'dd/MM/yyyy', { locale: ptBR }),
      'Dias para Vencer': d.diasParaVencer,
      'Status': d.status
    }));
    DataExporter.exportarParaCSV(dadosExport, 'documentos_vencendo');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard de Prazos e Validades</h1>
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

      {dados.alertasCriticos.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{dados.alertasCriticos.length} documentos críticos</strong> precisam de atenção imediata (vencidos ou vencendo em 7 dias)
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{dados.totais.vencidos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vence em 7 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{dados.totais.vencendo7}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Vence em 30 dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{dados.totais.vencendo30}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Válidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{dados.totais.validos}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Tipo de Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.distribuicaoPorTipo}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="tipo" 
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
                <Bar dataKey="vencidos" stackId="a" fill="#ef4444" name="Vencidos" />
                <Bar dataKey="vencendo7" stackId="a" fill="#f97316" name="Vence em 7 dias" />
                <Bar dataKey="vencendo30" stackId="a" fill="#f59e0b" name="Vence em 30 dias" />
                <Bar dataKey="validos" stackId="a" fill="#10b981" name="Válidos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documentos com Prazos Críticos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Credenciado</th>
                  <th className="text-left py-3 px-4 font-medium">CPF</th>
                  <th className="text-left py-3 px-4 font-medium">Documento</th>
                  <th className="text-left py-3 px-4 font-medium">Vencimento</th>
                  <th className="text-right py-3 px-4 font-medium">Dias</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {dados.alertasCriticos.slice(0, 20).map((doc, index) => (
                  <tr key={index} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">{doc.credenciado}</td>
                    <td className="py-3 px-4 font-mono text-sm">{doc.cpf}</td>
                    <td className="py-3 px-4">{doc.tipoDocumento}</td>
                    <td className="py-3 px-4">
                      {format(doc.dataVencimento, 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className={doc.diasParaVencer < 0 ? 'text-red-600 font-bold' : 'text-orange-600 font-bold'}>
                        {doc.diasParaVencer}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        doc.status === 'vencido' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {doc.status === 'vencido' ? 'Vencido' : 'Vence em breve'}
                      </span>
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
