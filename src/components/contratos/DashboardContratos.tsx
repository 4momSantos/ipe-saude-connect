import { useState } from "react";
import { useTodosContratos } from "@/hooks/useContratos";
import { useReprocessLegacyInscricoes } from "@/hooks/useReprocessLegacyInscricoes";
import { useResendSignatureEmail } from "@/hooks/useResendSignatureEmail";
import { useRegenerateContract } from "@/hooks/useRegenerateContract";
import { useGerarContrato } from "@/hooks/useGerarContrato";
import { useAutoRefreshContratos } from "@/hooks/useAutoRefreshContratos";
import { useCorrigirInscricoesOrfas } from "@/hooks/useCorrigirInscricoesOrfas";
import { useReprocessStuckContracts } from "@/hooks/useReprocessStuckContracts";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const { contratos, filtrar, isLoading, refetch } = useTodosContratos();
  const { mutate: reprocessLegacy, isPending } = useReprocessLegacyInscricoes();
  const { mutate: resendEmail, isPending: isResending } = useResendSignatureEmail();
  const { mutate: regenerateContract, isPending: isRegenerating } = useRegenerateContract();
  const { gerar: gerarContrato, isLoading: isGerandoContrato } = useGerarContrato();
  const { mutate: corrigirOrfas, isPending: isCorrigindo } = useCorrigirInscricoesOrfas();
  const { mutate: reprocessStuck, isPending: isReprocessingStuck } = useReprocessStuckContracts();
  
  // ✅ Ativar auto-refresh para contratos pendentes
  useAutoRefreshContratos({ 
    contratos,
    enabled: true,
    interval: 15000 
  });
  
  const { mutate: checkStatus, isPending: isCheckingStatus } = useMutation({
    mutationFn: async (contratoId: string) => {
      const { data, error } = await supabase.functions.invoke('check-assinafy-status', {
        body: { contratoId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.signed) {
        toast.success('✅ Contrato sincronizado! Status atualizado para assinado.');
      } else {
        toast.info(`Status: ${data.status}`);
      }
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao verificar status: ${error.message}`);
    }
  });
  
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resendingContratoId, setResendingContratoId] = useState<string | null>(null);

  const handleReprocess = async () => {
    setShowConfirmDialog(false);
    
    // IDs dos 6 contratos antigos com problema no auto_place
    const problematicContractIds = [
      '989b786a-c049-4e56-a0a1-b6582fc3c624', // CONT-2025-363742
      '7979f582-8e59-4059-8383-98c0d7162d90', // CONT-2025-924195
      '658f7ab0-0b80-4da0-92c3-5bdae0a2c998', // CONT-2025-358380
      'de3eb547-16a4-4375-8771-8784c1679703', // CONT-2025-803944
      '3e3a5267-4794-4284-a5f8-e34673a7e88c', // CONT-2025-686159
      'dbcdc8ce-70d2-4c4e-9253-92eac963fa17'  // CONT-2025-325932
    ];
    
    toast.loading('Reprocessando 6 contratos antigos...', { id: 'reprocess' });
    
    try {
      // Buscar eventos antes do reprocessamento
      const { data: eventosAntes } = await supabase.functions.invoke('check-assinafy-status', {
        body: { contratoIds: problematicContractIds, detailed: true }
      });
      
      console.log('[REPROCESS] Eventos ANTES:', eventosAntes);
      
      // Chamar resend-signature-emails
      const { data, error } = await supabase.functions.invoke('resend-signature-emails', {
        body: { contratoIds: problematicContractIds }
      });
      
      if (error) throw error;
      
      console.log('[REPROCESS] Resultado:', data);
      
      // Mostrar relatório detalhado
      if (data) {
        const { total_success, total_errors, results } = data;
        
        // Mostrar toast com resumo
        if (total_errors === 0) {
          toast.success(
            `✅ Todos os ${total_success} contratos reprocessados com sucesso!`,
            { id: 'reprocess', duration: 5000 }
          );
        } else {
          toast.warning(
            `⚠️ ${total_success} sucessos, ${total_errors} erros`,
            { id: 'reprocess', duration: 5000 }
          );
        }
        
        // Log detalhado de cada contrato
        console.group('📋 RELATÓRIO DETALHADO DE REPROCESSAMENTO');
        results.forEach((result: any, index: number) => {
          if (result.success) {
            console.log(`✅ ${index + 1}. Contrato ${result.contrato_id.substring(0, 8)}...`);
            console.log(`   Email: ${result.email}`);
            console.log(`   ✓ Signature request criado com sucesso`);
          } else {
            console.error(`❌ ${index + 1}. Contrato ${result.contrato_id.substring(0, 8)}...`);
            console.error(`   ERRO: ${result.error}`);
          }
        });
        console.groupEnd();
        
        // Buscar eventos após o reprocessamento (com delay)
        setTimeout(async () => {
          const { data: eventosDepois } = await supabase.functions.invoke('check-assinafy-status', {
            body: { contratoIds: problematicContractIds, detailed: true }
          });
          
          console.log('[REPROCESS] Eventos DEPOIS:', eventosDepois);
        }, 3000);
      }
      
      refetch();
    } catch (error: any) {
      console.error('[REPROCESS] Erro fatal:', error);
      toast.error(`Erro ao reprocessar: ${error.message}`, { id: 'reprocess' });
    }
  };

  const contratosFiltrados = contratos
    .filter(c => {
      const inscricao = c.inscricao as any;
      const candidatoNome = 
        inscricao?.candidato?.nome || 
        inscricao?.dados_inscricao?.dadosPessoais?.nome ||
        inscricao?.dados_inscricao?.dados_pessoais?.nome_completo ||
        inscricao?.candidato?.email;
      
      // Verificar se contrato foi enviado (tem signature_requests)
      const signatureRequests = (c as any).signature_requests;
      const naoEnviado = !signatureRequests || (Array.isArray(signatureRequests) && signatureRequests.length === 0);
      
      // Filtros
      let matchesStatus = true;
      if (statusFilter === 'nao_enviado') {
        matchesStatus = naoEnviado && c.status === 'pendente_assinatura';
      } else {
        matchesStatus = !statusFilter || statusFilter === 'todos' || c.status === statusFilter;
      }
      
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
              {contratos.some(c => c.status === 'pendente_assinatura') && (
                <Badge variant="outline" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Atualizando a cada 15s
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => reprocessStuck()}
                variant="destructive"
                size="sm"
                disabled={isReprocessingStuck}
              >
                {isReprocessingStuck ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                🔧 Reprocessar Órfãos
              </Button>
              <Button
                onClick={() => corrigirOrfas()}
                variant="default"
                size="sm"
                disabled={isCorrigindo}
              >
                {isCorrigindo ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Corrigir Inscrições Órfãs
              </Button>
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
                Reprocessar 6 Contratos Antigos
              </Button>
            </div>
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
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="nao_enviado">Não Enviados</SelectItem>
                <SelectItem value="pendente_assinatura">Aguardando Assinatura</SelectItem>
                <SelectItem value="assinado">Assinado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter !== 'todos' || searchQuery) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter("todos");
                  setSearchQuery("");
                }}
              >
                Limpar Filtros
              </Button>
            )}
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

                    // Verificar problemas no contrato (PDF missing)
                    const temPDF = contrato.documento_url && contrato.documento_url.length > 0;
                    const statusProblematico = contrato.status === 'pendente_assinatura' && !temPDF;
                    
                    // Verificar se contrato foi enviado para assinatura
                    const signatureRequests = (contrato as any).signature_requests;
                    const naoEnviado = !signatureRequests || (Array.isArray(signatureRequests) && signatureRequests.length === 0);

                    return (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-medium">
                          {contrato.numero_contrato}
                          {statusProblematico && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Sem PDF
                            </Badge>
                          )}
                          {naoEnviado && contrato.status === 'pendente_assinatura' && (
                            <Badge variant="outline" className="ml-2 text-xs border-yellow-500 text-yellow-700">
                              Não Enviado
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
                            {contrato.documento_url ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    toast.loading('Baixando PDF...', { id: 'download' });
                                    
                                    const response = await fetch(contrato.documento_url!);
                                    if (!response.ok) throw new Error('Erro ao buscar PDF');
                                    
                                    const blob = await response.blob();
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `Contrato_${contrato.numero_contrato}.pdf`;
                                    document.body.appendChild(a);
                                    a.click();
                                    
                                    window.URL.revokeObjectURL(url);
                                    document.body.removeChild(a);
                                    
                                    toast.success('PDF baixado com sucesso!', { id: 'download' });
                                  } catch (error) {
                                    toast.error('Erro ao baixar PDF', { id: 'download' });
                                    console.error(error);
                                  }
                                }}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                                onClick={() => toast.error('Contrato ainda não disponível para download')}
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
                            
                            {/* Botões para contratos não enviados */}
                            {contrato.status === "pendente_assinatura" && naoEnviado && temPDF && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={async () => {
                                  try {
                                    await gerarContrato({ inscricaoId: contrato.inscricao_id });
                                    refetch();
                                  } catch (error) {
                                    console.error('Erro ao enviar contrato:', error);
                                  }
                                }}
                                disabled={isGerandoContrato}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Enviar para Assinatura
                              </Button>
                            )}
                            
                            {contrato.status === "pendente_assinatura" && (
                              statusProblematico ? (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      toast.loading('Gerando novo contrato...', { id: 'regen' });
                                      
                                      const result = await gerarContrato({ 
                                        inscricaoId: contrato.inscricao_id 
                                      });
                                      
                                      toast.success('Contrato regenerado e enviado para assinatura', {
                                        id: 'regen',
                                        description: `Número: ${result.numero_contrato}`
                                      });
                                      
                                      refetch();
                                    } catch (error: any) {
                                      toast.error('Erro ao regenerar contrato', {
                                        id: 'regen',
                                        description: error.message
                                      });
                                    }
                                  }}
                                  disabled={isGerandoContrato}
                                >
                                  <RefreshCw className={`h-4 w-4 mr-2 ${isGerandoContrato ? 'animate-spin' : ''}`} />
                                  Regenerar e Enviar para Assinatura
                                </Button>
                              ) : !naoEnviado && (
                                 <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setResendingContratoId(contrato.id);
                                    resendEmail([contrato.id], {
                                      onSettled: () => setResendingContratoId(null)
                                    });
                                  }}
                                  disabled={resendingContratoId === contrato.id}
                                >
                                  <Mail className={`h-4 w-4 mr-2 ${resendingContratoId === contrato.id ? 'animate-spin' : ''}`} />
                                  Reenviar E-mail
                                </Button>
                              )
                            )}
                            {contrato.status === "pendente_assinatura" && !naoEnviado && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => checkStatus(contrato.id)}
                                disabled={isCheckingStatus}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Verificar Status
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
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {contratos.filter(c => {
                    const signatureRequests = (c as any).signature_requests;
                    const naoEnviado = !signatureRequests || (Array.isArray(signatureRequests) && signatureRequests.length === 0);
                    return c.status === 'pendente_assinatura' && naoEnviado;
                  }).length}
                </div>
                <p className="text-xs text-muted-foreground">Não Enviados</p>
              </CardContent>
            </Card>
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
            <AlertDialogTitle>Reprocessar 6 Contratos Antigos</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá reprocessar os 6 contratos antigos que estavam com o parâmetro 
              <code className="bg-muted px-1 rounded">auto_place: true</code> inválido.
              <br /><br />
              <strong>Contratos:</strong> CONT-2025-363742, CONT-2025-924195, CONT-2025-358380, 
              CONT-2025-803944, CONT-2025-686159, CONT-2025-325932
              <br /><br />
              Serão criadas novas solicitações de assinatura SEM o parâmetro inválido e os emails 
              serão reenviados. Um relatório detalhado será exibido no console.
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
