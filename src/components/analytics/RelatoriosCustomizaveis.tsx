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

  async function generateReport() {
    try {
      setLoading(true);

      // Buscar dados de credenciados
      const { data: credenciados, error: credError } = await supabase
        .from("credenciados")
        .select("id, nome, cidade, estado, status")
        .eq("status", "Ativo");

      if (credError) throw credError;

      // Buscar especialidades
      const { data: especialidades, error: espError } = await supabase
        .from("credenciado_crms")
        .select("credenciado_id, especialidade");

      if (espError) throw espError;

      // Processar dados baseado no agrupamento
      let reportData: any[] = [];

      if (agrupamento === "especialidade") {
        const espMap = new Map<string, number>();
        especialidades?.forEach((esp) => {
          espMap.set(esp.especialidade, (espMap.get(esp.especialidade) || 0) + 1);
        });

        reportData = Array.from(espMap.entries()).map(([especialidade, total]) => ({
          Especialidade: especialidade,
          Total: total,
        }));
      } else if (agrupamento === "municipio") {
        const cidadeMap = new Map<string, number>();
        credenciados?.forEach((cred) => {
          const key = `${cred.cidade} - ${cred.estado}`;
          cidadeMap.set(key, (cidadeMap.get(key) || 0) + 1);
        });

        reportData = Array.from(cidadeMap.entries()).map(([municipio, total]) => ({
          Município: municipio,
          Total: total,
        }));
      } else if (agrupamento === "regiao") {
        const regiaoMap: Record<string, string[]> = {
          Norte: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
          Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
          "Centro-Oeste": ["DF", "GO", "MT", "MS"],
          Sudeste: ["ES", "MG", "RJ", "SP"],
          Sul: ["PR", "RS", "SC"],
        };

        const regiaoCount: Record<string, number> = {};
        credenciados?.forEach((cred) => {
          const regiao = Object.entries(regiaoMap).find(([_, estados]) =>
            estados.includes(cred.estado || "")
          )?.[0] || "Outros";
          regiaoCount[regiao] = (regiaoCount[regiao] || 0) + 1;
        });

        reportData = Object.entries(regiaoCount).map(([regiao, total]) => ({
          Região: regiao,
          Total: total,
        }));
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
