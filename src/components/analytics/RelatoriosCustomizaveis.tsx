import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, FileText, Table as TableIcon, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToPDF, exportToExcel, exportToCSV } from "@/lib/export-utils";

type TipoCalculo = "media" | "mediana" | "total";
type TipoAgrupamento = "especialidade" | "municipio" | "regiao";

export function RelatoriosCustomizaveis() {
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>("total");
  const [agrupamento, setAgrupamento] = useState<TipoAgrupamento>("especialidade");
  const [loading, setLoading] = useState(false);

  // Dados mockados completos com mais cidades
  const dadosMockados = {
    credenciadosPorEspecialidade: [
      { Especialidade: "Clínica Geral", Total: 524 },
      { Especialidade: "Cardiologia", Total: 438 },
      { Especialidade: "Pediatria", Total: 412 },
      { Especialidade: "Ortopedia", Total: 385 },
      { Especialidade: "Ginecologia", Total: 367 },
      { Especialidade: "Dermatologia", Total: 298 },
      { Especialidade: "Neurologia", Total: 276 },
      { Especialidade: "Oftalmologia", Total: 254 },
      { Especialidade: "Psiquiatria", Total: 231 },
      { Especialidade: "Urologia", Total: 198 },
    ],
    credenciadosPorMunicipio: [
      { Município: "Porto Alegre - RS", Total: 487 },
      { Município: "Caxias do Sul - RS", Total: 298 },
      { Município: "Canoas - RS", Total: 245 },
      { Município: "Pelotas - RS", Total: 217 },
      { Município: "Santa Maria - RS", Total: 189 },
      { Município: "Curitiba - PR", Total: 421 },
      { Município: "Londrina - PR", Total: 267 },
      { Município: "Maringá - PR", Total: 198 },
      { Município: "Florianópolis - SC", Total: 356 },
      { Município: "Joinville - SC", Total: 289 },
      { Município: "Blumenau - SC", Total: 234 },
      { Município: "São Paulo - SP", Total: 812 },
      { Município: "Rio de Janeiro - RJ", Total: 654 },
      { Município: "Belo Horizonte - MG", Total: 489 },
      { Município: "Brasília - DF", Total: 398 },
      { Município: "Salvador - BA", Total: 367 },
      { Município: "Fortaleza - CE", Total: 298 },
      { Município: "Recife - PE", Total: 276 },
      { Município: "Manaus - AM", Total: 234 },
      { Município: "Belém - PA", Total: 198 },
    ],
    credenciadosPorRegiao: [
      { Região: "Sul", Total: 1247 },
      { Região: "Sudeste", Total: 1089 },
      { Região: "Centro-Oeste", Total: 587 },
      { Região: "Nordeste", Total: 534 },
      { Região: "Norte", Total: 390 },
    ],
  };

  async function generateReport() {
    try {
      setLoading(true);

      // Usar dados mockados baseado no agrupamento
      let reportData: any[] = [];

      if (agrupamento === "especialidade") {
        reportData = [...dadosMockados.credenciadosPorEspecialidade];
      } else if (agrupamento === "municipio") {
        reportData = [...dadosMockados.credenciadosPorMunicipio];
      } else if (agrupamento === "regiao") {
        reportData = [...dadosMockados.credenciadosPorRegiao];
      }

      // Aplicar cálculo
      if (tipoCalculo === "media" && reportData.length > 0) {
        const total = reportData.reduce((sum, item) => sum + (item.Total || 0), 0);
        const media = (total / reportData.length).toFixed(2);
        reportData.push({ [Object.keys(reportData[0])[0]]: "MÉDIA", Total: media });
      } else if (tipoCalculo === "mediana" && reportData.length > 0) {
        const valores = reportData.map((item) => item.Total).sort((a, b) => a - b);
        const meio = Math.floor(valores.length / 2);
        const mediana =
          valores.length % 2 === 0
            ? ((valores[meio - 1] + valores[meio]) / 2).toFixed(2)
            : valores[meio];
        reportData.push({ [Object.keys(reportData[0])[0]]: "MEDIANA", Total: mediana });
      }

      return reportData;
    } catch (error) {
      console.error("Erro ao gerar relatório:", error);
      toast.error("Erro ao gerar relatório");
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: "pdf" | "excel" | "csv") {
    const data = await generateReport();
    if (data.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const titulo = `Relatório de Credenciados - ${agrupamento}`;

    try {
      if (format === "pdf") {
        await exportToPDF(data, titulo);
        toast.success("PDF gerado com sucesso!");
      } else if (format === "excel") {
        await exportToExcel(data, titulo);
        toast.success("Excel gerado com sucesso!");
      } else if (format === "csv") {
        await exportToCSV(data, titulo);
        toast.success("CSV gerado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error(`Erro ao exportar em ${format.toUpperCase()}`);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="card-glow">
        <CardHeader>
          <CardTitle>Relatórios Customizáveis</CardTitle>
          <CardDescription>
            Personalize e exporte relatórios em múltiplos formatos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configurações */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tipo-calculo">Tipo de Cálculo</Label>
              <Select value={tipoCalculo} onValueChange={(v) => setTipoCalculo(v as TipoCalculo)}>
                <SelectTrigger id="tipo-calculo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="mediana">Mediana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agrupamento">Agrupar Por</Label>
              <Select
                value={agrupamento}
                onValueChange={(v) => setAgrupamento(v as TipoAgrupamento)}
              >
                <SelectTrigger id="agrupamento">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="especialidade">Especialidade</SelectItem>
                  <SelectItem value="municipio">Município</SelectItem>
                  <SelectItem value="regiao">Região</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões de exportação */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Exportar Relatório</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Button
                variant="outline"
                className="gap-2 hover-lift"
                onClick={() => handleExport("pdf")}
                disabled={loading}
              >
                <FileText className="h-5 w-5 text-red-500" />
                Exportar PDF
              </Button>

              <Button
                variant="outline"
                className="gap-2 hover-lift"
                onClick={() => handleExport("excel")}
                disabled={loading}
              >
                <FileSpreadsheet className="h-5 w-5 text-green-500" />
                Exportar Excel
              </Button>

              <Button
                variant="outline"
                className="gap-2 hover-lift"
                onClick={() => handleExport("csv")}
                disabled={loading}
              >
                <TableIcon className="h-5 w-5 text-blue-500" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Indicadores visuais */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-400" />
                  <div>
                    <p className="text-sm font-medium text-blue-400">PDF</p>
                    <p className="text-xs text-muted-foreground">Formato ideal para impressão</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-green-400">Excel</p>
                    <p className="text-xs text-muted-foreground">Planilhas e análises</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-500/10 border-purple-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TableIcon className="h-8 w-8 text-purple-400" />
                  <div>
                    <p className="text-sm font-medium text-purple-400">CSV</p>
                    <p className="text-xs text-muted-foreground">Dados tabulares</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
