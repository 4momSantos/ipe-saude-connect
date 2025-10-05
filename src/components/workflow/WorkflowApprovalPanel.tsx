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
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
                profiles!inscricoes_edital_candidato_id_fkey (nome, email),
                editais (titulo, numero_edital)
              )
            )
          )
        `)
        .eq("decision", "pending")
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

  async function handleApprove(approval: PendingApproval) {
    setSelectedApproval(approval);
    setComments("");
  }

  async function handleReject(approval: PendingApproval) {
    setSelectedApproval(approval);
    setComments("");
  }

  async function submitDecision(decision: 'approved' | 'rejected') {
    if (!selectedApproval) return;

    try {
      setSubmitting(true);

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
        .eq("id", selectedApproval.id);

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

      // Continuar workflow se aprovado
      if (decision === 'approved') {
        const { error: continueError } = await supabase.functions.invoke('continue-workflow', {
          body: {
            stepExecutionId: selectedApproval.step_execution_id,
            decision,
          }
        });

        if (continueError) {
          console.error("Erro ao continuar workflow:", continueError);
          toast.warning("Aprovação registrada, mas houve erro ao continuar o workflow automaticamente.");
        } else {
          toast.success("Aprovação registrada! O workflow continuará automaticamente.");
        }
      } else {
        toast.success("Rejeição registrada. O candidato será notificado.");
      }

      setSelectedApproval(null);
      setComments("");
      loadPendingApprovals();
    } catch (error) {
      console.error("Erro ao processar decisão:", error);
      toast.error("Erro ao processar decisão");
    } finally {
      setSubmitting(false);
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
        <div className="flex items-center justify-between">
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

        {approvals.map((approval) => {
          const inscricao = approval.inscricao;
          if (!inscricao) return null;

          return (
            <Card key={approval.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {inscricao.editais.titulo}
                    </CardTitle>
                    <CardDescription className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>{inscricao.profiles.nome}</span>
                      </div>
                      <div className="text-xs">
                        Edital: {inscricao.editais.numero_edital} • Workflow: {approval.workflow_step_executions.workflow_executions.workflows.name}
                      </div>
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-orange-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Aguardando
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(approval)}
                    className="flex-1"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleReject(approval)}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedApproval} onOpenChange={() => setSelectedApproval(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirmar Decisão
            </DialogTitle>
            <DialogDescription>
              Adicione comentários sobre sua decisão (opcional).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Comentários sobre a decisão..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedApproval(null)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => submitDecision('approved')}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitDecision('rejected')}
              disabled={submitting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
