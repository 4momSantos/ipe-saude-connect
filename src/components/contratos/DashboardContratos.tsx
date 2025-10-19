import { useState } from "react";
import { useTodosContratos } from "@/hooks/useContratos";
import { useReprocessLegacyInscricoes } from "@/hooks/useReprocessLegacyInscricoes";
import { useResendSignatureEmail } from "@/hooks/useResendSignatureEmail";
import { useRegenerateContract } from "@/hooks/useRegenerateContract";
import { useGerarContrato } from "@/hooks/useGerarContrato";
import { useAutoRefreshContratos } from "@/hooks/useAutoRefreshContratos";
import { useCorrigirInscricoesOrfas } from "@/hooks/useCorrigirInscricoesOrfas";
import { useReprocessStuckContracts } from "@/hooks/useReprocessStuckContracts";
import { useSmartContractSend } from "@/hooks/useSmartContractSend";
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
  const { mutate: sendSingleContract } = useSmartContractSend();
  
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

  const { mutate: checkAllSignatures, isPending: isCheckingAll } = useMutation({
    mutationFn: async () => {
      const pendingContracts = contratos
        .filter(c => c.status === 'pendente_assinatura')
        .map(c => c.id);
      
      if (pendingContracts.length === 0) {
        throw new Error('Nenhum contrato pendente de assinatura encontrado');
      }

      const results = [];
      for (const contratoId of pendingContracts) {
        const { data, error } = await supabase.functions.invoke('check-assinafy-status', {
          body: { contratoId }
        });
        if (!error && data) {
          results.push({ contratoId, ...data });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const signed = results.filter(r => r.signed).length;
      const total = results.length;
      
      if (signed > 0) {
        toast.success(`✅ ${signed} de ${total} contratos já assinados foram sincronizados!`);
      } else {
        toast.info(`Verificados ${total} contratos. Nenhum novo assinado encontrado.`);
      }
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao verificar assinaturas: ${error.message}`);
    }
  });

  const { mutate: syncAllContracts, isPending: isSyncing } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-assinafy-status');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.totalUpdated > 0) {
        toast.success(`🔄 ${data.totalUpdated} contratos sincronizados com Assinafy!`);
      } else {
        toast.info(data.message || 'Nenhum contrato precisou ser atualizado');
      }
      refetch();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    }
  });
  
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resendingContratoId, setResendingContratoId] = useState<string | null>(null);
  const [sendingContratoId, setSendingContratoId] = useState<string | null>(null);
  const [recentlySent, setRecentlySent] = useState<Set<string>>(new Set());

  // 🛡️ Helper para verificar se contrato tem signature ativa
  const hasPendingSignature = (contrato: any) => {
    const signatureRequests = contrato.signature_requests;
    if (!signatureRequests || !Array.isArray(signatureRequests) || signatureRequests.length === 0) {
      return false;
    }
    
    // Verificar se existe alguma signature ativa (pending ou sent)
    return signatureRequests.some((sr: any) => 
      (sr.status === 'pending' || sr.status === 'sent') && 
      (sr.metadata?.assinafy_assignment_id || sr.metadata?.assignment_id)
    );
  };

  // 🛡️ Helper para obter a signature request mais recente
  const getLatestSignatureRequest = (contrato: any) => {
    const signatureRequests = contrato.signature_requests;
    if (!signatureRequests || !Array.isArray(signatureRequests) || signatureRequests.length === 0) {
      return null;
    }
    
    // Ordenar por created_at descendente e pegar o mais recente
    return [...signatureRequests].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  };

  const handleSendSingleContract = (contratoId: string) => {
    // 🛡️ VALIDAÇÃO ANTI-DUPLICAÇÃO
    const contrato = contratos?.find(c => c.id === contratoId);
    
    if (!contrato) {
      toast.error('❌ Contrato não encontrado');
      return;
    }
    
    // Verificar se já tem signature ativa
    if (hasPendingSignature(contrato)) {
      const latestSR = getLatestSignatureRequest(contrato);
      const dataEnvio = latestSR?.created_at 
        ? new Date(latestSR.created_at).toLocaleString('pt-BR')
        : 'desconhecida';
      
      const emailDestinatario = (contrato as any).inscricao?.candidato?.email || 
                                (contrato as any).inscricao?.dados_inscricao?.dados_pessoais?.email ||
                                'email não encontrado';
      
      toast.error(
        '❌ Este contrato já foi enviado para assinatura',
        {
          description: `Último envio: ${dataEnvio}\nPara: ${emailDestinatario}\n\n💡 Use "Reenviar E-mail" se o candidato não recebeu.`,
          duration: 8000
        }
      );
      return;
    }
    
    // Continuar com envio normal
    setSendingContratoId(contratoId);
    sendSingleContract(contratoId, {
      onSuccess: () => {
        toast.success('✅ Contrato enviado para assinatura!');
        
        // Adicionar à lista de recém-enviados
        setRecentlySent(prev => new Set(prev).add(contratoId));
        
        // Remover badge após 10 segundos
        setTimeout(() => {
          setRecentlySent(prev => {
            const newSet = new Set(prev);
            newSet.delete(contratoId);
            return newSet;
          });
        }, 10000);
        
        refetch();
      },
      onError: () => {
        toast.error('❌ Erro ao enviar contrato');
      },
      onSettled: () => {
        setSendingContratoId(null);
      }
    });
  };

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
      const candidato = inscricao?.candidato;
      const candidatoNome = 
        candidato?.nome || 
        candidato?.email ||
        inscricao?.dados_inscricao?.dadosPessoais?.nome ||
        inscricao?.dados_inscricao?.dados_pessoais?.nome_completo;
      
      // Verificar se contrato foi enviado (tem signature_requests VÁLIDOS)
      const signatureRequests = (c as any).signature_requests;
      const temSignatureRequest = signatureRequests && Array.isArray(signatureRequests) && signatureRequests.length > 0;
      
      // Considerar "não enviado" se:
      // 1. Não tem signature_request OU
      // 2. Tem signature_request mas está stuck (status='pending' sem assignment_id)
      const naoEnviado = !temSignatureRequest || 
        (temSignatureRequest && signatureRequests.some((sr: any) => {
          const hasAssignment = sr.metadata?.assinafy_assignment_id || sr.metadata?.assignment_id;
          return sr.status === 'pending' && !hasAssignment;
        }));
      
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
                onClick={() => checkAllSignatures()}
                variant="default"
                size="sm"
                disabled={isCheckingAll}
              >
                {isCheckingAll ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                ✅ Buscar Assinadas
              </Button>
              <Button
                onClick={() => syncAllContracts()}
                variant="outline"
                size="sm"
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                🔄 Sincronizar com Assinafy
              </Button>
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
                    
                    // Ordem correta de prioridade para nome do candidato
                    const candidatoNome = 
                      candidato?.nome || // Primeiro: profile.nome
                      candidato?.email || // Segundo: profile.email
                      inscricao?.dados_inscricao?.dadosPessoais?.nome || // Terceiro: dados da inscrição
                      inscricao?.dados_inscricao?.dados_pessoais?.nome_completo ||
                      "Candidato sem nome";

                    // Verificar problemas no contrato (PDF missing)
                    const temPDF = contrato.documento_url && contrato.documento_url.length > 0;
                    const statusProblematico = contrato.status === 'pendente_assinatura' && !temPDF;
                    
                    // Verificar se contrato foi enviado para assinatura
                    const signatureRequests = (contrato as any).signature_requests;
                    const temSignatureRequest = signatureRequests && Array.isArray(signatureRequests) && signatureRequests.length > 0;
                    
                    const naoEnviado = !temSignatureRequest || 
                      (temSignatureRequest && signatureRequests.some((sr: any) => {
                        const hasAssignment = sr.metadata?.assinafy_assignment_id || sr.metadata?.assignment_id;
                        return sr.status === 'pending' && !hasAssignment;
                      }));

                    return (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-medium">
                          {contrato.numero_contrato}
                          
                          {/* Badge de contrato recém-enviado */}
                          {recentlySent.has(contrato.id) && (
                            <Badge variant="default" className="ml-2 text-xs bg-green-600 hover:bg-green-600">
                              ✉️ Enviado agora
                            </Badge>
                          )}
                          
                          {/* 🆕 Badge de múltiplos envios */}
                          {(() => {
                            const signatureRequests = (contrato as any).signature_requests;
                            const count = signatureRequests?.length || 0;
                            
                            if (count > 1) {
                              return (
                                <Badge 
                                  variant="outline" 
                                  className="ml-2 text-xs border-orange-500 bg-orange-50 text-orange-700 font-semibold"
                                  title={`Este contrato foi enviado ${count} vezes. Pode indicar tentativas de reenvio ou duplicação.`}
                                >
                                  📨 {count} envios
                                </Badge>
                              );
                            }
                            return null;
                          })()}
                          
                          {statusProblematico && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Sem PDF
                            </Badge>
                          )}
                          {naoEnviado && contrato.status === 'pendente_assinatura' && (
                            <Badge 
                              variant="outline" 
                              className={`ml-2 text-xs font-semibold ${
                                temSignatureRequest 
                                  ? 'border-red-500 bg-red-50 text-red-700' 
                                  : 'border-amber-500 bg-amber-50 text-amber-700'
                              }`}
                            >
                              {temSignatureRequest ? '🔴 Stuck - Reenviar' : '⚠️ Pendente Envio'}
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
                                onClick={() => handleSendSingleContract(contrato.id)}
                                disabled={sendingContratoId === contrato.id || hasPendingSignature(contrato)}
                                className="bg-green-600 hover:bg-green-700"
                                title={
                                  hasPendingSignature(contrato)
                                    ? `⚠️ Este contrato já foi enviado. Use "Reenviar E-mail" se necessário.`
                                    : "Enviar contrato para assinatura digital"
                                }
                              >
                                {sendingContratoId === contrato.id ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                    Enviando...
                                  </>
                                ) : (
                                  <>
                                    <Mail className="h-4 w-4 mr-1" />
                                    📤 Enviar
                                  </>
                                )}
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
                                    // Obter informações para confirmação
                                    const latestSR = getLatestSignatureRequest(contrato);
                                    const dataEnvio = latestSR?.created_at 
                                      ? new Date(latestSR.created_at).toLocaleString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })
                                      : 'desconhecida';
                                    
                                    const emailDestinatario = (contrato as any).inscricao?.candidato?.email || 
                                                              (contrato as any).inscricao?.dados_inscricao?.dados_pessoais?.email ||
                                                              'email não encontrado';
                                    
                                    // Confirmar antes de reenviar
                                    const confirmMsg = 
                                      `🔄 Reenviar e-mail de assinatura?\n\n` +
                                      `📧 Para: ${emailDestinatario}\n` +
                                      `📅 Último envio: ${dataEnvio}\n\n` +
                                      `⚠️ IMPORTANTE: Isso NÃO cria um novo documento.\n` +
                                      `O candidato receberá o MESMO link de assinatura.\n\n` +
                                      `Deseja continuar?`;
                                    
                                    if (confirm(confirmMsg)) {
                                      setResendingContratoId(contrato.id);
                                      resendEmail([contrato.id], {
                                        onSuccess: () => {
                                          toast.success('✅ E-mail reenviado com sucesso!', {
                                            description: `Para: ${emailDestinatario}`
                                          });
                                        },
                                        onSettled: () => setResendingContratoId(null)
                                      });
                                    }
                                  }}
                                  disabled={resendingContratoId === contrato.id}
                                  title={`Reenviar mesmo link de assinatura (último envio: ${
                                    getLatestSignatureRequest(contrato)?.created_at 
                                      ? new Date(getLatestSignatureRequest(contrato)!.created_at).toLocaleString('pt-BR')
                                      : 'desconhecido'
                                  })`}
                                >
                                  {resendingContratoId === contrato.id ? (
                                    <>
                                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      Reenviando...
                                    </>
                                  ) : (
                                    <>
                                      <Mail className="h-4 w-4 mr-2" />
                                      🔄 Reenviar E-mail
                                    </>
                                  )}
                                </Button>
                              )
                            )}
                            {contrato.status === "pendente_assinatura" && !naoEnviado && (
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => checkStatus(contrato.id)}
                                disabled={isCheckingStatus}
                                title="Verificar se o contrato já foi assinado digitalmente"
                              >
                                {isCheckingStatus ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Validando...
                                  </>
                                ) : (
                                  <>
                                    ✅ Validar Assinatura Digital
                                  </>
                                )}
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
                    const temSignatureRequest = signatureRequests && Array.isArray(signatureRequests) && signatureRequests.length > 0;
                    const naoEnviado = !temSignatureRequest || 
                      (temSignatureRequest && signatureRequests.some((sr: any) => {
                        const hasAssignment = sr.metadata?.assinafy_assignment_id || sr.metadata?.assignment_id;
                        return sr.status === 'pending' && !hasAssignment;
                      }));
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
