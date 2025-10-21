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
import { useSimularAssinatura } from "@/hooks/useSimularAssinatura";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Search, Filter, Download, ExternalLink, Mail, RefreshCw, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TesteAssinatura } from "./TesteAssinatura";
export function DashboardContratos() {
  const {
    contratos,
    filtrar,
    isLoading,
    refetch
  } = useTodosContratos();
  const {
    mutate: reprocessLegacy,
    isPending
  } = useReprocessLegacyInscricoes();
  const {
    mutate: resendEmail,
    isPending: isResending
  } = useResendSignatureEmail();
  const {
    mutate: regenerateContract,
    isPending: isRegenerating
  } = useRegenerateContract();
  const {
    gerar: gerarContrato,
    isLoading: isGerandoContrato
  } = useGerarContrato();
  const {
    mutate: corrigirOrfas,
    isPending: isCorrigindo
  } = useCorrigirInscricoesOrfas();
  const {
    mutate: reprocessStuck,
    isPending: isReprocessingStuck
  } = useReprocessStuckContracts();
  const {
    mutate: sendSingleContract
  } = useSmartContractSend();
  const simularAssinatura = useSimularAssinatura();

  // ✅ Ativar auto-refresh para contratos pendentes
  useAutoRefreshContratos({
    contratos,
    enabled: true,
    interval: 15000
  });
  const {
    mutate: checkStatus,
    isPending: isCheckingStatus
  } = useMutation({
    mutationFn: async (contratoId: string) => {
      const {
        data,
        error
      } = await supabase.functions.invoke('check-assinafy-status', {
        body: {
          contratoId
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
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
  const {
    mutate: checkAllSignatures,
    isPending: isCheckingAll
  } = useMutation({
    mutationFn: async () => {
      const pendingContracts = contratos.filter(c => c.status === 'pendente_assinatura').map(c => c.id);
      if (pendingContracts.length === 0) {
        throw new Error('Nenhum contrato pendente de assinatura encontrado');
      }
      const results = [];
      for (const contratoId of pendingContracts) {
        const {
          data,
          error
        } = await supabase.functions.invoke('check-assinafy-status', {
          body: {
            contratoId
          }
        });
        if (!error && data) {
          results.push({
            contratoId,
            ...data
          });
        }
      }
      return results;
    },
    onSuccess: results => {
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
  const {
    mutate: syncAllContracts,
    isPending: isSyncing
  } = useMutation({
    mutationFn: async () => {
      const {
        data,
        error
      } = await supabase.functions.invoke('sync-assinafy-status');
      if (error) throw error;
      return data;
    },
    onSuccess: data => {
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
  const [validatingContratoId, setValidatingContratoId] = useState<string | null>(null);

  // 🎯 Helper para obter a signature request mais recente
  const getLatestSignatureRequest = (contrato: any) => {
    const signatureRequests = contrato.signature_requests;
    if (!signatureRequests || !Array.isArray(signatureRequests) || signatureRequests.length === 0) {
      return null;
    }
    return [...signatureRequests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  // 🎯 Helper para identificar o estado do contrato
  const getContractState = (contrato: any): 'NAO_ENVIADO' | 'STUCK' | 'ENVIADO_PENDENTE' => {
    // Se está no set de recém-enviados, considerar como ENVIADO_PENDENTE
    if (recentlySent.has(contrato.id)) {
      console.log(`[ESTADO] Contrato ${contrato.numero_contrato}: ENVIADO_PENDENTE (recém-enviado)`);
      return 'ENVIADO_PENDENTE';
    }
    const signatureRequests = contrato.signature_requests;
    if (!signatureRequests?.length) {
      return 'NAO_ENVIADO';
    }
    const latestSR = getLatestSignatureRequest(contrato);
    // Metadata pode vir como objeto ou string JSON do banco
    let metadata = latestSR?.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (e) {
        console.error('[PARSE ERROR] Erro ao parsear metadata:', e);
        metadata = {};
      }
    }
    const hasAssignment = metadata?.assinafy_assignment_id || metadata?.assignment_id;
    
    console.log(`[DEBUG ASSIGNMENT] ${contrato.numero_contrato}:`, {
      hasAssignment,
      metadata,
      sr_status: latestSR?.status
    });
    const isActiveStatus = ['pending', 'sent'].includes(latestSR?.status);

    // Verificar se é recente (criado há menos de 5 minutos)
    const now = new Date().getTime();
    const createdAt = latestSR?.created_at ? new Date(latestSR.created_at).getTime() : 0;
    const isRecent = now - createdAt < 5 * 60 * 1000; // 5 minutos

    // Se tem assignment_id e status ativo, definitivamente foi enviado
    if (hasAssignment && isActiveStatus) {
      console.log(`[ESTADO] Contrato ${contrato.numero_contrato}: ENVIADO_PENDENTE (tem assignment_id)`);
      return 'ENVIADO_PENDENTE';
    }

    // Se não tem assignment_id MAS é recente e status ativo, considerar enviado
    // (pode estar esperando webhook da Assinafy processar)
    if (!hasAssignment && isActiveStatus && isRecent) {
      const minutosAtras = Math.floor((now - createdAt) / 1000 / 60);
      console.log(`[ESTADO] Contrato ${contrato.numero_contrato}: ENVIADO_PENDENTE (recente: ${minutosAtras}min atrás, aguardando assignment_id)`);
      return 'ENVIADO_PENDENTE';
    }

    // Se não tem assignment_id, status ativo, mas NÃO é recente = está stuck
    if (!hasAssignment && isActiveStatus && !isRecent) {
      console.log(`[ESTADO] Contrato ${contrato.numero_contrato}: STUCK (sem assignment_id há muito tempo)`);
      return 'STUCK';
    }

    // Se status não está ativo (cancelled, expired, failed)
    console.log(`[ESTADO] Contrato ${contrato.numero_contrato}: NAO_ENVIADO (status: ${latestSR?.status})`);
    return 'NAO_ENVIADO';
  };
  const handleValidarAssinatura = async (contratoId: string) => {
    if (!confirm('⚠️ Tem certeza que deseja validar esta assinatura manualmente?\n\nIsso marcará o contrato como assinado e ativará o credenciado.')) {
      return;
    }
    setValidatingContratoId(contratoId);
    try {
      await simularAssinatura.mutateAsync({
        contratoId,
        force: true
      });
    } catch (error: any) {
      toast.error(`Erro ao validar assinatura: ${error.message}`);
    } finally {
      setValidatingContratoId(null);
    }
  };
  const handleSendSingleContract = (contratoId: string) => {
    const contrato = contratos?.find(c => c.id === contratoId);
    if (!contrato) {
      toast.error('❌ Contrato não encontrado');
      return;
    }
    const state = getContractState(contrato);

    // Validação anti-duplicação: só permitir envio se NAO_ENVIADO ou STUCK
    if (state === 'ENVIADO_PENDENTE') {
      const latestSR = getLatestSignatureRequest(contrato);
      const dataEnvio = latestSR?.created_at ? new Date(latestSR.created_at).toLocaleString('pt-BR') : 'desconhecida';
      const emailDestinatario = (contrato as any).inscricao?.candidato?.email || (contrato as any).inscricao?.dados_inscricao?.dados_pessoais?.email || 'email não encontrado';
      toast.error('❌ Este contrato já foi enviado para assinatura', {
        description: `Último envio: ${dataEnvio}\nPara: ${emailDestinatario}\n\n💡 Use "Reenviar E-mail" se o candidato não recebeu.`,
        duration: 8000
      });
      return;
    }
    setSendingContratoId(contratoId);
    sendSingleContract(contratoId, {
      onSuccess: () => {
        toast.success('✅ Contrato enviado para assinatura!');

        // Marcar como recém-enviado por 5 minutos (tempo para webhook processar)
        setRecentlySent(prev => new Set(prev).add(contratoId));
        setTimeout(() => {
          setRecentlySent(prev => {
            const newSet = new Set(prev);
            newSet.delete(contratoId);
            return newSet;
          });
        }, 5 * 60 * 1000); // 5 minutos

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
    const problematicContractIds = ['989b786a-c049-4e56-a0a1-b6582fc3c624',
    // CONT-2025-363742
    '7979f582-8e59-4059-8383-98c0d7162d90',
    // CONT-2025-924195
    '658f7ab0-0b80-4da0-92c3-5bdae0a2c998',
    // CONT-2025-358380
    'de3eb547-16a4-4375-8771-8784c1679703',
    // CONT-2025-803944
    '3e3a5267-4794-4284-a5f8-e34673a7e88c',
    // CONT-2025-686159
    'dbcdc8ce-70d2-4c4e-9253-92eac963fa17' // CONT-2025-325932
    ];
    toast.loading('Reprocessando 6 contratos antigos...', {
      id: 'reprocess'
    });
    try {
      // Buscar eventos antes do reprocessamento
      const {
        data: eventosAntes
      } = await supabase.functions.invoke('check-assinafy-status', {
        body: {
          contratoIds: problematicContractIds,
          detailed: true
        }
      });
      console.log('[REPROCESS] Eventos ANTES:', eventosAntes);

      // Chamar resend-signature-emails
      const {
        data,
        error
      } = await supabase.functions.invoke('resend-signature-emails', {
        body: {
          contratoIds: problematicContractIds
        }
      });
      if (error) throw error;
      console.log('[REPROCESS] Resultado:', data);

      // Mostrar relatório detalhado
      if (data) {
        const {
          total_success,
          total_errors,
          results
        } = data;

        // Mostrar toast com resumo
        if (total_errors === 0) {
          toast.success(`✅ Todos os ${total_success} contratos reprocessados com sucesso!`, {
            id: 'reprocess',
            duration: 5000
          });
        } else {
          toast.warning(`⚠️ ${total_success} sucessos, ${total_errors} erros`, {
            id: 'reprocess',
            duration: 5000
          });
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
          const {
            data: eventosDepois
          } = await supabase.functions.invoke('check-assinafy-status', {
            body: {
              contratoIds: problematicContractIds,
              detailed: true
            }
          });
          console.log('[REPROCESS] Eventos DEPOIS:', eventosDepois);
        }, 3000);
      }
      refetch();
    } catch (error: any) {
      console.error('[REPROCESS] Erro fatal:', error);
      toast.error(`Erro ao reprocessar: ${error.message}`, {
        id: 'reprocess'
      });
    }
  };
  const contratosFiltrados = contratos.filter(c => {
    const inscricao = c.inscricao as any;
    const candidato = inscricao?.candidato;
    const candidatoNome = candidato?.nome || candidato?.email || inscricao?.dados_inscricao?.dadosPessoais?.nome || inscricao?.dados_inscricao?.dados_pessoais?.nome_completo;

    // Usar nova função de estado
    const state = getContractState(c);
    const naoEnviado = state === 'NAO_ENVIADO' || state === 'STUCK';

    // Filtros
    let matchesStatus = true;
    if (statusFilter === 'nao_enviado') {
      matchesStatus = naoEnviado && c.status === 'pendente_assinatura';
    } else {
      matchesStatus = !statusFilter || statusFilter === 'todos' || c.status === statusFilter;
    }
    const matchesSearch = !searchQuery || c.numero_contrato?.toLowerCase().includes(searchQuery.toLowerCase()) || candidatoNome?.toLowerCase().includes(searchQuery.toLowerCase());
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
    return <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>;
  }
  return <div className="space-y-4">
      <TesteAssinatura />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Gestão de Contratos
              {contratos.some(c => c.status === 'pendente_assinatura') && <Badge variant="outline" className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Atualizando a cada 15s
                </Badge>}
            </div>
            <div className="flex gap-2">
              
              
              
              
              
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por número do contrato ou nome do candidato..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
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
            {(statusFilter !== 'todos' || searchQuery) && <Button variant="outline" onClick={() => {
            setStatusFilter("todos");
            setSearchQuery("");
          }}>
                Limpar Filtros
              </Button>}
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
                {contratosFiltrados.length === 0 ? <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum contrato encontrado
                    </TableCell>
                  </TableRow> : contratosFiltrados.map(contrato => {
                const inscricao = contrato.inscricao as any;
                const edital = inscricao?.edital;
                const candidato = inscricao?.candidato;

                // Ordem correta de prioridade para nome do candidato
                const candidatoNome = candidato?.nome ||
                // Primeiro: profile.nome
                candidato?.email ||
                // Segundo: profile.email
                inscricao?.dados_inscricao?.dadosPessoais?.nome ||
                // Terceiro: dados da inscrição
                inscricao?.dados_inscricao?.dados_pessoais?.nome_completo || "Candidato sem nome";

                // Verificar problemas no contrato (PDF missing)
                const temPDF = contrato.documento_url && contrato.documento_url.length > 0;
                const statusProblematico = contrato.status === 'pendente_assinatura' && !temPDF;

                // Obter estado do contrato
                const state = getContractState(contrato);
                const naoEnviado = state === 'NAO_ENVIADO' || state === 'STUCK';
                const enviadoPendente = state === 'ENVIADO_PENDENTE';
                return <TableRow key={contrato.id}>
                        <TableCell className="font-medium">
                          {contrato.numero_contrato}
                          
                          {/* Badge de contrato recém-enviado */}
                          {recentlySent.has(contrato.id) && <Badge variant="default" className="ml-2 text-xs bg-green-600 hover:bg-green-600">
                              ✉️ Enviado agora
                            </Badge>}
                          
                          {/* 🆕 Badge de múltiplos envios */}
                          {(() => {
                      const signatureRequests = (contrato as any).signature_requests;
                      const count = signatureRequests?.length || 0;
                      if (count > 1) {
                        return <Badge variant="outline" className="ml-2 text-xs border-orange-500 bg-orange-50 text-orange-700 font-semibold" title={`Este contrato foi enviado ${count} vezes. Pode indicar tentativas de reenvio ou duplicação.`}>
                                  📨 {count} envios
                                </Badge>;
                      }
                      return null;
                    })()}
                          
                          {statusProblematico && <Badge variant="destructive" className="ml-2 text-xs">
                              Sem PDF
                            </Badge>}
                          {/* Badges baseados no estado */}
                          {contrato.status === 'pendente_assinatura' && state === 'STUCK' && <Badge variant="destructive" className="ml-2 text-xs font-semibold">
                              🔴 Falha no Envio
                            </Badge>}
                          {contrato.status === 'pendente_assinatura' && state === 'NAO_ENVIADO' && <Badge variant="outline" className="ml-2 text-xs font-semibold border-amber-500 bg-amber-50 text-amber-700">
                              ⚠️ Pendente Envio
                            </Badge>}
                          {contrato.status === 'pendente_assinatura' && state === 'ENVIADO_PENDENTE' && (
                            <Badge 
                              variant="default" 
                              className="ml-2 text-xs bg-blue-600 hover:bg-blue-600"
                              title={(() => {
                                const latestSR = getLatestSignatureRequest(contrato);
                                const dataEnvio = latestSR?.created_at 
                                  ? new Date(latestSR.created_at).toLocaleString('pt-BR')
                                  : 'data desconhecida';
                                const docId = latestSR?.external_id || 'N/A';
                                
                                // Parse metadata corretamente
                                let metadata = latestSR?.metadata;
                                if (typeof metadata === 'string') {
                                  try {
                                    metadata = JSON.parse(metadata);
                                  } catch (e) {
                                    metadata = {};
                                  }
                                }
                                const assignmentId = metadata?.assinafy_assignment_id || metadata?.assignment_id || 'N/A';
                                
                                return `Enviado ao Assinafy em ${dataEnvio}\nDoc ID: ${docId}\nAssignment ID: ${assignmentId}`;
                              })()}
                            >
                              📧 Enviado ao Assinafy
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
                          {contrato.assinado_em ? new Date(contrato.assinado_em).toLocaleDateString("pt-BR") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {contrato.documento_url ? <Button size="sm" variant="outline" onClick={async () => {
                        try {
                          toast.loading('Baixando PDF...', {
                            id: 'download'
                          });
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
                          toast.success('PDF baixado com sucesso!', {
                            id: 'download'
                          });
                        } catch (error) {
                          toast.error('Erro ao baixar PDF', {
                            id: 'download'
                          });
                          console.error(error);
                        }
                      }}>
                                <Download className="h-4 w-4" />
                              </Button> : <Button size="sm" variant="outline" disabled onClick={() => toast.error('Contrato ainda não disponível para download')}>
                                <Download className="h-4 w-4" />
                              </Button>}
                            {contrato.status === "pendente_assinatura" && (contrato.dados_contrato as any)?.assinafy_url && <Button size="sm" variant="default" onClick={() => window.open((contrato.dados_contrato as any)?.assinafy_url, "_blank")}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>}
                            
                            {/* ========== LÓGICA DOS BOTÕES POR ESTADO ========== */}
                            {contrato.status === "pendente_assinatura" && (() => {
                        // Estado: NAO_ENVIADO ou STUCK
                        if (state === 'NAO_ENVIADO' || state === 'STUCK') {
                          return <>
                                    {/* Botão ENVIAR - sempre primeiro para contratos não enviados */}
                                    {temPDF && <Button size="sm" variant="default" onClick={() => handleSendSingleContract(contrato.id)} disabled={sendingContratoId === contrato.id || recentlySent.has(contrato.id)} className="bg-green-600 hover:bg-green-700" title="Enviar contrato para assinatura digital">
                                        {sendingContratoId === contrato.id ? <>
                                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                            Enviando...
                                          </> : <>
                                            <Mail className="h-4 w-4 mr-1" />
                                            📤 Enviar
                                          </>}
                                      </Button>}
                                    
                                    {/* Botão REGENERAR - só se não tem PDF */}
                                    {!temPDF && <Button size="sm" variant="destructive" onClick={async () => {
                              try {
                                toast.loading('Gerando novo contrato...', {
                                  id: 'regen'
                                });
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
                            }} disabled={isGerandoContrato}>
                                        <RefreshCw className={`h-4 w-4 mr-2 ${isGerandoContrato ? 'animate-spin' : ''}`} />
                                        Regenerar PDF
                                      </Button>}
                                  </>;
                        }

                        // Estado: ENVIADO_PENDENTE
                        if (state === 'ENVIADO_PENDENTE') {
                          const latestSR = getLatestSignatureRequest(contrato);
                          // Metadata pode vir como objeto ou string JSON do banco
                          let metadata = latestSR?.metadata;
                          if (typeof metadata === 'string') {
                            try {
                              metadata = JSON.parse(metadata);
                            } catch (e) {
                              metadata = {};
                            }
                          }
                          const hasAssignment = metadata?.assinafy_assignment_id || metadata?.assignment_id;

                          // Debug log para contratos específicos
                          if (['CONT-2025-485295', 'CONT-2025-289812', 'CONT-2025-270384'].includes(contrato.numero_contrato)) {
                            console.log(`[DEBUG] ${contrato.numero_contrato}:`, {
                              estado: state,
                              temSignatureRequest: latestSR !== null,
                              hasAssignment,
                              external_id: latestSR?.external_id,
                              created_at: latestSR?.created_at,
                              status: latestSR?.status
                            });
                          }

                          // Verificar se signature request existe (pode não existir se acabou de enviar)
                          const temSignatureRequest = latestSR !== null;
                          return <>
                                    {/* Badge visual de confirmação */}
                                    <Badge 
                                      variant="default" 
                                      className="mr-2 bg-blue-600 hover:bg-blue-600 text-xs"
                                      title={`Enviado ao Assinafy em ${latestSR?.created_at ? new Date(latestSR.created_at).toLocaleString('pt-BR') : 'data desconhecida'}\nDoc ID: ${latestSR?.external_id || 'N/A'}\nAssignment ID: ${hasAssignment || 'N/A'}`}
                                    >
                                      📧 Enviado ao Assinafy
                                    </Badge>

                                    {/* Botão REENVIAR E-MAIL - só mostrar se tem SR confirmado */}
                                    {temSignatureRequest && <Button size="sm" variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" onClick={() => {
                              const dataEnvio = latestSR?.created_at ? new Date(latestSR.created_at).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'desconhecida';
                              const emailDestinatario = (contrato as any).inscricao?.candidato?.email || (contrato as any).inscricao?.dados_inscricao?.dados_pessoais?.email || 'email não encontrado';
                              const confirmMsg = `🔄 Reenviar e-mail de assinatura?\n\n` + `📧 Para: ${emailDestinatario}\n` + `📅 Último envio: ${dataEnvio}\n\n` + `⚠️ IMPORTANTE: Isso NÃO cria um novo documento.\n` + `O candidato receberá o MESMO link de assinatura.\n\n` + `Deseja continuar?`;
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
                            }} disabled={resendingContratoId === contrato.id} title={`Reenviar mesmo link de assinatura`}>
                                      {resendingContratoId === contrato.id ? <>
                                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                          Reenviando...
                                        </> : <>
                                          <Mail className="h-4 w-4 mr-2" />
                                          🔄 Reenviar E-mail
                                        </>}
                                    </Button>}
                                    
                                    {/* Botão VALIDAR ASSINATURA - sempre mostrar se está em ENVIADO_PENDENTE */}
                                    <Button size="sm" variant="outline" onClick={() => handleValidarAssinatura(contrato.id)} disabled={validatingContratoId === contrato.id} className="border-green-600 text-green-600 hover:bg-green-50" title={hasAssignment ? "Marcar como assinado manualmente" : "Validar assinatura (aguardando confirmação do envio)"}>
                                      {validatingContratoId === contrato.id ? <>
                                          <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                          Validando...
                                        </> : <>
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          ✅ Validar Assinatura
                                        </>}
                                    </Button>
                                    
                                    {/* Badge de "Aguardando confirmação" se não tem assignment ainda */}
                                    {!hasAssignment && recentlySent.has(contrato.id)}
                                  </>;
                        }
                        return null;
                      })()}
                          </div>
                        </TableCell>
                      </TableRow>;
              })}
              </TableBody>
            </Table>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {contratos.filter(c => {
                  const state = getContractState(c);
                  return c.status === 'pendente_assinatura' && (state === 'NAO_ENVIADO' || state === 'STUCK');
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
    </div>;
}