import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useDadosConformidade } from '@/hooks/useDashboardData';
import { DataExporter } from '@/utils/exportData';

export function DashboardConformidade() {
  const { data: dados, isLoading } = useDadosConformidade();

  if (isLoading) return <div className="text-center py-12">Carregando...</div>;
  if (!dados) return <div className="text-center py-12">Sem dados</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Análise de Conformidade</h1>
        <Button onClick={() => DataExporter.exportarParaExcel(dados.credenciados, 'conformidade')} variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4 mr-2" />Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Total</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{dados.visaoGeral.totalCredenciados}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Conformes</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{dados.visaoGeral.conformes}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">Não Conformes</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-600">{dados.visaoGeral.naoConformes}</div></CardContent></Card>
        <Card><CardHeader className="pb-3"><CardTitle className="text-sm">% Geral</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{dados.visaoGeral.percentualGeralConformidade}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Distribuição por Níveis</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dados.distribuicaoNiveis} dataKey="quantidade" nameKey="nivel" cx="50%" cy="50%" outerRadius={100} label>
                  {dados.distribuicaoNiveis.map((entry, index) => <Cell key={index} fill={entry.cor} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
