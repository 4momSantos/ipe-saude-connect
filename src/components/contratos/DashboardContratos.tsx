import { useState } from "react";
import { useTodosContratos } from "@/hooks/useContratos";
import { useReprocessSignatures } from "@/hooks/useReprocessSignatures";
import { useResendSignatureEmail } from "@/hooks/useResendSignatureEmail";
import { useRegenerateContract } from "@/hooks/useRegenerateContract";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FileText, Search, Filter, Download, ExternalLink, Mail, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TesteAssinatura } from "./TesteAssinatura";

export function DashboardContratos() {
  const { contratos, filtrar, isLoading } = useTodosContratos();
  const { mutate: reprocessSignatures, isPending } = useReprocessSignatures();
  const { mutate: resendEmail, isPending: isResending } = useResendSignatureEmail();
  const { mutate: regenerateContract, isPending: isRegenerating } = useRegenerateContract();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleReprocess = () => {
    setShowConfirmDialog(false);
    reprocessSignatures();
  };

  const contratosFiltrados = contratos
    .filter(c => {
      const inscricao = c.inscricao as any;
      const candidatoNome = 
        inscricao?.candidato?.nome || 
        inscricao?.dados_inscricao?.dadosPessoais?.nome ||
        inscricao?.dados_inscricao?.dados_pessoais?.nome_completo ||
        inscricao?.candidato?.email;
        
      const matchesStatus = !statusFilter || c.status === statusFilter;
      const matchesSearch = !searchQuery || 
        c.numero_contrato?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        candidatoNome?.toLowerCase().includes(searchQuery.toLowerCase());
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
      <TesteAssinatura />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Gestão de Contratos
            </div>
            <Button
              onClick={() => setShowConfirmDialog(true)}
              variant="outline"
              size="sm"
              disabled={isPending}
            >
              {isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reprocessar Assinaturas Pendentes
            </Button>
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
                    const candidato = inscricao?.candidato;
                    
                    // Fallbacks inteligentes para nome do candidato
                    const candidatoNome = 
                      candidato?.nome || 
                      inscricao?.dados_inscricao?.dadosPessoais?.nome ||
                      inscricao?.dados_inscricao?.dados_pessoais?.nome_completo ||
                      candidato?.email?.split('@')[0] ||
                      "Candidato sem nome";

                    // Verificar problemas no contrato
                    const temHTML = (contrato.dados_contrato as any)?.html;
                    const statusProblematico = contrato.status === 'pendente_assinatura' && !temHTML;

                    return (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-medium">
                          {contrato.numero_contrato}
                          {statusProblematico && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Sem HTML
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{candidatoNome}</TableCell>
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
                            {contrato.status === "pendente_assinatura" && (
                              statusProblematico ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => regenerateContract({ contrato_id: contrato.id })}
                                  disabled={isRegenerating}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Regenerar Contrato
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => resendEmail([contrato.id])}
                                  disabled={isResending}
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Reenviar E-mail
                                </Button>
                              )
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

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reprocessar Assinaturas Pendentes</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá identificar contratos com status "Pendente de Assinatura" que não
              possuem solicitação de assinatura vinculada e enviará os emails de assinatura
              automaticamente.
              <br /><br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReprocess}>
              Confirmar Reprocessamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
