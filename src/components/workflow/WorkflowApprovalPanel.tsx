import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertCircle,
  User
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PendingApproval {
  id: string;
  step_execution_id: string;
  created_at: string;
  decision: string;
  workflow_step_executions: {
    id: string;
    node_type: string;
    node_id: string;
    execution_id: string;
    workflow_executions: {
      id: string;
      workflows: {
        name: string;
        version: number;
      };
    };
  };
  inscricao?: {
    id: string;
    edital_id: string;
    candidato_id: string;
    profiles: {
      nome: string;
      email: string;
    };
    editais: {
      titulo: string;
      numero_edital: string;
    };
  };
}

export function WorkflowApprovalPanel() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [selectedAction, setSelectedAction] = useState<'approved' | 'rejected' | null>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPendingApprovals();

    // Subscrever para atualizações em tempo real
    const channel = supabase
      .channel('workflow-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_approvals',
        },
        () => {
          loadPendingApprovals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadPendingApprovals() {
    try {
      setLoading(true);
      
      console.log('[APPROVAL_PANEL] Buscando aprovações pendentes...');
      
      // Query única com JOIN para buscar tudo de uma vez
      // ✅ Fase 17: Excluir workflows órfãs (sem step_executions)
      const { data: approvals, error: approvalsError } = await supabase
        .from("workflow_approvals")
        .select(`
          *,
          workflow_step_executions!inner (
            id,
            node_id,
            node_type,
            execution_id,
            workflow_executions!inner (
              id,
              started_at,
              status,
              workflows (name, version),
              inscricoes_edital!inscricoes_edital_workflow_execution_id_fkey (
                id,
                candidato_id,
                edital_id,
                status,
                dados_inscricao,
                profiles!inscricoes_edital_candidato_profile_fkey (nome, email),
                editais (titulo, numero_edital)
              )
            )
          )
        `)
        .eq("decision", "pending")
        .eq("workflow_step_executions.workflow_executions.status", "running")
        .not("workflow_step_executions.id", "is", null)
        .eq("workflow_step_executions.workflow_executions.status", "running")
        .not("workflow_step_executions.id", "is", null)
        .order("created_at", { ascending: false });

      if (approvalsError) throw approvalsError;

      // Transformar para o formato esperado
      const enrichedApprovals = (approvals || []).map((approval) => {
        const inscricaoArray = approval.workflow_step_executions.workflow_executions.inscricoes_edital;
        const inscricao = inscricaoArray && inscricaoArray.length > 0 ? inscricaoArray[0] : null;
        
        if (!inscricao) {
          return { ...approval, inscricao: null };
        }

        return {
          ...approval,
          inscricao: {
            id: inscricao.id,
            edital_id: inscricao.edital_id,
            candidato_id: inscricao.candidato_id,
            profiles: inscricao.profiles || { nome: "N/A", email: "N/A" },
            editais: inscricao.editais || { titulo: "N/A", numero_edital: "N/A" }
          }
        };
      });

      // Filtrar apenas aprovações que têm inscrição vinculada
      setApprovals(enrichedApprovals.filter(a => a.inscricao !== null) as PendingApproval[]);
    } catch (error) {
      console.error("Erro ao carregar aprovações pendentes:", error);
      toast.error("Erro ao carregar aprovações pendentes");
    } finally {
      setLoading(false);
    }
  }

  function handleApprove(approval: PendingApproval) {
    if (processingIds.has(approval.id)) return;
    setSelectedApproval(approval);
    setSelectedAction('approved');
    setComments("");
  }

  function handleReject(approval: PendingApproval) {
    if (processingIds.has(approval.id)) return;
    setSelectedApproval(approval);
    setSelectedAction('rejected');
    setComments("");
  }
  
  function closeDialog() {
    setSelectedApproval(null);
    setSelectedAction(null);
    setComments("");
  }

  async function submitDecision() {
    if (!selectedApproval || !selectedAction || submitting) return;

    const approvalId = selectedApproval.id;
    const decision = selectedAction;
    
    // Prevenir múltiplas submissões
    if (processingIds.has(approvalId)) {
      toast.warning("Esta aprovação já está sendo processada");
      return;
    }

    try {
      setSubmitting(true);
      setProcessingIds(prev => new Set(prev).add(approvalId));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Atualizar a decisão de aprovação
      const { error: updateError } = await supabase
        .from("workflow_approvals")
        .update({
          decision,
          comments,
          approver_id: user.id,
        })
        .eq("id", approvalId)
        .eq("decision", "pending"); // Garantir que só atualiza se ainda estiver pendente

      if (updateError) throw updateError;

      // Atualizar o status do step execution
      const { error: stepError } = await supabase
        .from("workflow_step_executions")
        .update({
          status: decision === 'approved' ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
        })
        .eq("id", selectedApproval.step_execution_id);

      if (stepError) throw stepError;

      // Continuar workflow se aprovado (sem aguardar resposta para evitar loops)
      if (decision === 'approved') {
        supabase.functions.invoke('continue-workflow', {
          body: {
            stepExecutionId: selectedApproval.step_execution_id,
            decision,
          }
        }).then(({ error: continueError }) => {
          if (continueError) {
            console.error("Erro ao continuar workflow:", continueError);
          }
        });
        
        toast.success("Aprovação registrada! O workflow continuará automaticamente.");
      } else {
        toast.success("Rejeição registrada. O candidato será notificado.");
      }

      closeDialog();
    } catch (error) {
      console.error("Erro ao processar decisão:", error);
      toast.error("Erro ao processar decisão");
    } finally {
      setSubmitting(false);
      // Remover do processamento após 3 segundos
      setTimeout(() => {
        setProcessingIds(prev => {
          const next = new Set(prev);
          next.delete(approvalId);
          return next;
        });
      }, 3000);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Nenhuma Aprovação Pendente
          </CardTitle>
          <CardDescription>
            Todas as aprovações foram processadas. Novas solicitações aparecerão aqui automaticamente.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Aprovações Pendentes</h3>
            <p className="text-sm text-muted-foreground">
              {approvals.length} {approvals.length === 1 ? 'solicitação aguardando' : 'solicitações aguardando'} sua análise
            </p>
          </div>
          <Badge variant="outline" className="text-orange-600 border-orange-500/20 bg-orange-500/10">
            <Clock className="h-3 w-3 mr-1" />
            {approvals.length} Pendente{approvals.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {approvals.map((approval) => {
          const inscricao = approval.inscricao;
          if (!inscricao) return null;

          const isProcessing = processingIds.has(approval.id);
          
          return (
            <Card key={approval.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">
                      {inscricao.editais.titulo}
                    </CardTitle>
                    <CardDescription className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{inscricao.profiles.nome}</span>
                      </div>
                      <div className="text-xs truncate">
                        {inscricao.editais.numero_edital}
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-orange-600 flex-shrink-0">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Aguardando
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(approval)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(approval)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      </div>

      <Dialog open={!!selectedApproval && !!selectedAction} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAction === 'approved' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Confirmar Aprovação
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Confirmar Rejeição
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedAction === 'approved' 
                ? 'Você está prestes a aprovar esta solicitação. Adicione comentários se necessário.'
                : 'Você está prestes a rejeitar esta solicitação. Por favor, adicione uma justificativa.'}
            </DialogDescription>
          </DialogHeader>

          {selectedApproval && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="text-sm">
                <span className="font-medium">Candidato:</span>{' '}
                {selectedApproval.inscricao?.profiles.nome}
              </div>
              <div className="text-sm">
                <span className="font-medium">Edital:</span>{' '}
                {selectedApproval.inscricao?.editais.numero_edital}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Comentários {selectedAction === 'rejected' && <span className="text-destructive">*</span>}
            </label>
            <Textarea
              placeholder={selectedAction === 'approved' 
                ? "Adicione comentários sobre a aprovação (opcional)..." 
                : "Explique o motivo da rejeição..."}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={submitting}
            >
              Cancelar
            </Button>
            {selectedAction === 'approved' ? (
              <Button
                onClick={submitDecision}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Confirmar Aprovação
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={submitDecision}
                disabled={submitting || !comments.trim()}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processando...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Confirmar Rejeição
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
