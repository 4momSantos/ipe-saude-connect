import { useState } from "react";
import { useTodosContratos } from "@/hooks/useContratos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search, Filter, Download, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardContratos() {
  const { contratos, filtrar, isLoading } = useTodosContratos();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const contratosFiltrados = contratos
    .filter(c => {
      const matchesStatus = !statusFilter || c.status === statusFilter;
      const matchesSearch = !searchQuery || 
        c.numero_contrato?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.inscricao as any)?.dados_inscricao?.dadosPessoais?.nome?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendente_assinatura":
        return <Badge variant="outline">Aguardando Assinatura</Badge>;
      case "assinado":
        return <Badge className="bg-green-500 hover:bg-green-600">Assinado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Gestão de Contratos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do contrato ou nome do candidato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-64">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pendente_assinatura">Aguardando Assinatura</SelectItem>
                <SelectItem value="assinado">Assinado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número do Contrato</TableHead>
                  <TableHead>Candidato</TableHead>
                  <TableHead>Edital</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Geração</TableHead>
                  <TableHead>Data Assinatura</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contratosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum contrato encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  contratosFiltrados.map((contrato) => {
                    const inscricao = contrato.inscricao as any;
                    const edital = inscricao?.edital;
                    const candidato = inscricao?.dados_inscricao?.dadosPessoais;

                    return (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-medium">
                          {contrato.numero_contrato}
                        </TableCell>
                        <TableCell>{candidato?.nome || "N/A"}</TableCell>
                        <TableCell>
                          {edital?.numero_edital || edital?.titulo || "N/A"}
                        </TableCell>
                        <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                        <TableCell>
                          {new Date(contrato.gerado_em || contrato.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {contrato.assinado_em
                            ? new Date(contrato.assinado_em).toLocaleDateString("pt-BR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {contrato.documento_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(contrato.documento_url!, "_blank")}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            {contrato.status === "pendente_assinatura" && (contrato.dados_contrato as any)?.assinafy_url && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => window.open((contrato.dados_contrato as any)?.assinafy_url, "_blank")}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{filtrar("pendente_assinatura").length}</div>
                <p className="text-xs text-muted-foreground">Aguardando Assinatura</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{filtrar("assinado").length}</div>
                <p className="text-xs text-muted-foreground">Assinados</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{contratos.length}</div>
                <p className="text-xs text-muted-foreground">Total de Contratos</p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
