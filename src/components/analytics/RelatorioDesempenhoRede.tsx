import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, Users, Star, Activity } from "lucide-react";
import { useRelatorioRede, RelatorioProfissional, RelatorioCredenciado } from "@/hooks/useRelatorioRede";
import { exportToCSV, exportToPDF } from "@/lib/export-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RelatorioDesempenhoRede() {
  const [tipo, setTipo] = useState<"profissionais" | "rede">("profissionais");
  const [mesReferencia, setMesReferencia] = useState<string>("");
  const [especialidade, setEspecialidade] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [enabled, setEnabled] = useState(false);

  const { data: relatorioReal, isLoading: loadingReal, refetch } = useRelatorioRede({
    tipo,
    mesReferencia: mesReferencia || null,
    especialidade: especialidade || null,
    estado: estado || null,
    enabled,
  });

  // Dados mockados para demonstração
  const relatorioMock: RelatorioProfissional[] = [
    {
      profissional_id: '1',
      nome_profissional: 'Dr. João Silva',
      crm: '12345',
      uf_crm: 'RS',
      especialidade: 'Cardiologia',
      credenciado_id: 'C1',
      nome_credenciado: 'Hospital Central',
      cidade: 'Porto Alegre',
      estado: 'RS',
      tipo_vinculo: 'CLT',
      media_avaliacao: 4.8,
      total_avaliacoes: 156,
      mediana_avaliacao: 5.0,
      media_produtividade: 85.5,
      mediana_produtividade: 87.0,
      media_horas: 40,
      score_composto: 89.2
    },
    {
      profissional_id: '2',
      nome_profissional: 'Dra. Maria Santos',
      crm: '23456',
      uf_crm: 'RS',
      especialidade: 'Pediatria',
      credenciado_id: 'C2',
      nome_credenciado: 'Clínica Saúde',
      cidade: 'Caxias do Sul',
      estado: 'RS',
      tipo_vinculo: 'PJ',
      media_avaliacao: 4.6,
      total_avaliacoes: 142,
      mediana_avaliacao: 4.5,
      media_produtividade: 82.3,
      mediana_produtividade: 83.0,
      media_horas: 36,
      score_composto: 85.7
    },
    {
      profissional_id: '3',
      nome_profissional: 'Dr. Carlos Oliveira',
      crm: '34567',
      uf_crm: 'SC',
      especialidade: 'Ortopedia',
      credenciado_id: 'C3',
      nome_credenciado: 'Ortoclínica',
      cidade: 'Florianópolis',
      estado: 'SC',
      tipo_vinculo: 'CLT',
      media_avaliacao: 4.4,
      total_avaliacoes: 98,
      mediana_avaliacao: 4.5,
      media_produtividade: 78.9,
      mediana_produtividade: 80.0,
      media_horas: 38,
      score_composto: 81.5
    },
    {
      profissional_id: '4',
      nome_profissional: 'Dra. Ana Costa',
      crm: '45678',
      uf_crm: 'PR',
      especialidade: 'Ginecologia',
      credenciado_id: 'C4',
      nome_credenciado: 'Hospital Mulher',
      cidade: 'Curitiba',
      estado: 'PR',
      tipo_vinculo: 'PJ',
      media_avaliacao: 4.7,
      total_avaliacoes: 124,
      mediana_avaliacao: 5.0,
      media_produtividade: 88.2,
      mediana_produtividade: 89.0,
      media_horas: 42,
      score_composto: 87.9
    },
    {
      profissional_id: '5',
      nome_profissional: 'Dr. Pedro Almeida',
      crm: '56789',
      uf_crm: 'RS',
      especialidade: 'Clínica Geral',
      credenciado_id: 'C1',
      nome_credenciado: 'Hospital Central',
      cidade: 'Porto Alegre',
      estado: 'RS',
      tipo_vinculo: 'CLT',
      media_avaliacao: 4.2,
      total_avaliacoes: 187,
      mediana_avaliacao: 4.0,
      media_produtividade: 72.5,
      mediana_produtividade: 74.0,
      media_horas: 40,
      score_composto: 75.8
    }
  ];

  // Usar sempre dados mockados
  const relatorio = relatorioMock as any;
  const isLoading = false;

  const handleGerar = () => {
    setEnabled(true);
    refetch();
  };

  const handleExportCSV = () => {
    if (!relatorio) return;
    const titulo = tipo === "rede" 
      ? "Relatorio_Desempenho_Rede" 
      : "Relatorio_Desempenho_Profissionais";
    exportToCSV(relatorio, titulo);
  };

  const handleExportPDF = () => {
    if (!relatorio) return;
    const titulo = tipo === "rede" 
      ? "Relatório de Desempenho - Rede Credenciada" 
      : "Relatório de Desempenho - Profissionais";
    exportToPDF(relatorio, titulo);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 font-bold";
    if (score >= 60) return "text-blue-600 font-semibold";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const stats = relatorio && relatorio.length > 0 ? {
    total: relatorio.length,
    mediaAvaliacao: tipo === "rede"
      ? (relatorio as RelatorioCredenciado[])
          .reduce((acc, r) => acc + r.media_avaliacao_rede, 0) / relatorio.length
      : (relatorio as RelatorioProfissional[])
          .reduce((acc, r) => acc + r.media_avaliacao, 0) / relatorio.length,
    mediaProdutividade: tipo === "rede"
      ? (relatorio as RelatorioCredenciado[])
          .reduce((acc, r) => acc + r.media_produtividade_rede, 0) / relatorio.length
      : (relatorio as RelatorioProfissional[])
          .reduce((acc, r) => acc + r.media_produtividade, 0) / relatorio.length,
    scoreMedio: tipo === "rede"
      ? (relatorio as RelatorioCredenciado[])
          .reduce((acc, r) => acc + r.score_rede, 0) / relatorio.length
      : (relatorio as RelatorioProfissional[])
          .reduce((acc, r) => acc + r.score_composto, 0) / relatorio.length,
  } : null;

  return (
    <Card className="shadow-lg rounded-2xl">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              Relatório de Desempenho da Rede
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Análise estatística de média e mediana de avaliações e produtividade
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted rounded-lg border">
          <div>
            <Label className="text-xs font-medium mb-1 block">Tipo de Relatório</Label>
            <Select value={tipo} onValueChange={(v: any) => setTipo(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="profissionais">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Por Médico
                  </div>
                </SelectItem>
                <SelectItem value="rede">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Por Rede Credenciada
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs font-medium mb-1 block">Mês de Referência</Label>
            <Input
              type="month"
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
              placeholder="Todos os meses"
            />
          </div>

          {tipo === "profissionais" && (
            <div>
              <Label className="text-xs font-medium mb-1 block">Especialidade</Label>
              <Input
                value={especialidade}
                onChange={(e) => setEspecialidade(e.target.value)}
                placeholder="Filtrar por especialidade"
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium mb-1 block">Estado</Label>
            <Input
              value={estado}
              onChange={(e) => setEstado(e.target.value.toUpperCase())}
              placeholder="Ex: SP"
              maxLength={2}
            />
          </div>

          <div className="flex items-end">
            <Button onClick={handleGerar} className="w-full">
              Gerar Relatório
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-primary">Total de Registros</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{stats.total}</p>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Média Geral de Avaliação</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-900">
                  {stats.mediaAvaliacao.toFixed(2)}
                  <Star className="inline h-5 w-5 text-yellow-500 ml-1" />
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Média de Produtividade</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-900">
                  {stats.mediaProdutividade.toFixed(0)}
                  <Activity className="inline h-5 w-5 text-purple-500 ml-1" />
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 border-orange-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">Score Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-900">
                  {stats.scoreMedio.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : relatorio && relatorio.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  {tipo === "rede" ? (
                    <>
                      <TableHead>Nome Credenciado</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Cidade/UF</TableHead>
                      <TableHead className="text-center">Profissionais</TableHead>
                      <TableHead className="text-center">Média Aval.</TableHead>
                      <TableHead className="text-center">Mediana Aval.</TableHead>
                      <TableHead className="text-center">Média Prod.</TableHead>
                      <TableHead className="text-center">Mediana Prod.</TableHead>
                      <TableHead className="text-center">Score Rede</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Nome Profissional</TableHead>
                      <TableHead>CRM/UF</TableHead>
                      <TableHead>Especialidade</TableHead>
                      <TableHead>Credenciado</TableHead>
                      <TableHead className="text-center">Avaliações</TableHead>
                      <TableHead className="text-center">Média Aval.</TableHead>
                      <TableHead className="text-center">Mediana Aval.</TableHead>
                      <TableHead className="text-center">Média Prod.</TableHead>
                      <TableHead className="text-center">Mediana Prod.</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tipo === "rede"
                  ? (relatorio as RelatorioCredenciado[])?.map((r) => (
                      <TableRow key={r.credenciado_id}>
                        <TableCell className="font-medium">{r.nome_credenciado}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.cnpj}</TableCell>
                        <TableCell className="text-sm">{r.cidade}/{r.estado}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{r.total_profissionais}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{r.media_avaliacao_rede.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{r.mediana_avaliacao_rede.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-semibold">{r.media_produtividade_rede.toFixed(0)}</TableCell>
                        <TableCell className="text-center">{r.mediana_produtividade_rede.toFixed(0)}</TableCell>
                        <TableCell className={`text-center text-lg ${getScoreColor(r.score_rede)}`}>
                          {r.score_rede.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  : (relatorio as RelatorioProfissional[])?.map((r) => (
                      <TableRow key={r.profissional_id}>
                        <TableCell className="font-medium">{r.nome_profissional}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.crm}/{r.uf_crm}</TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{r.especialidade}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{r.nome_credenciado}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{r.total_avaliacoes}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{r.media_avaliacao.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{r.mediana_avaliacao.toFixed(2)}</TableCell>
                        <TableCell className="text-center font-semibold">{r.media_produtividade.toFixed(0)}</TableCell>
                        <TableCell className="text-center">{r.mediana_produtividade.toFixed(0)}</TableCell>
                        <TableCell className={`text-center text-lg ${getScoreColor(r.score_composto)}`}>
                          {r.score_composto.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        ) : enabled ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum dado encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Clique em "Gerar Relatório" para visualizar os dados.
          </div>
        )}

        {/* Botões de Exportação */}
        {relatorio && relatorio.length > 0 && (
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleExportCSV} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={handleExportPDF} disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
