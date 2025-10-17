import { useState, useEffect } from "react";
import { X, FileText, MessageSquare, History, CheckCircle, XCircle, AlertCircle, Workflow, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DocumentsTab } from "./process-tabs/DocumentsTab";
import { MessagesTab } from "./process-tabs/MessagesTab";
import { HistoryTab } from "./process-tabs/HistoryTab";
import { DadosInscricaoView } from "./analises/DadosInscricaoView";
import { WorkflowTimeline } from "./workflow/WorkflowTimeline";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowStep, WorkflowAction } from "@/types/workflow";
import { DecisaoDialog } from "@/components/analises/DecisaoDialog";
import { ClipboardCheck } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

interface Processo {
  id: string;
  protocolo: string;
  nome: string;
  especialidade: string;
  dataSubmissao: string;
  status: "em_analise" | "aguardando_analise" | "aprovado" | "pendente" | "inabilitado";
  analista?: string;
  edital_titulo?: string;
}

interface ProcessDetailPanelProps {
  processo: Processo;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: "aprovado" | "inabilitado" | "pendente") => void;
}

export function ProcessDetailPanel({ processo, onClose, onStatusChange }: ProcessDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("dados");
  const [workflowData, setWorkflowData] = useState<any>(null);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [workflowActions, setWorkflowActions] = useState<WorkflowAction[]>([]);
  const [currentStepId, setCurrentStepId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dadosInscricao, setDadosInscricao] = useState<any>(null);
  const [decisaoDialogOpen, setDecisaoDialogOpen] = useState(false);
  const [analiseId, setAnaliseId] = useState<string>("");
  const { unreadCount } = useUnreadMessages(processo.id);

  // Marcar mensagens como lidas ao abrir a aba de mensagens
  useEffect(() => {
    if (activeTab === 'mensagens') {
      markMessagesAsRead();
    }
  }, [activeTab]);

  const markMessagesAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Marcar todas as mensagens não lidas como lidas
      const { error } = await supabase
        .from('workflow_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('inscricao_id', processo.id)
        .eq('is_read', false)
        .neq('sender_id', user.id);

      if (error) {
        console.error('[MARK_READ] Erro ao marcar mensagens como lidas:', error);
      }
    } catch (error) {
      console.error('[MARK_READ] Erro:', error);
    }
  };

  useEffect(() => {
    loadWorkflowData();

    // Subscrever para atualizações em tempo real
    const channel = supabase
      .channel(`workflow-${processo.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_step_executions',
        },
        () => {
          loadWorkflowData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [processo.id]);

  async function loadWorkflowData() {
    try {
      setLoading(true);
      console.log('[PROCESS_DETAIL] Loading workflow data for processo:', processo.id);

      // Buscar inscrição com workflow e dados completos
      const { data: inscricao, error: inscricaoError } = await supabase
        .from('inscricoes_edital')
        .select(`
          id,
          dados_inscricao,
          workflow_execution_id,
          candidato:profiles(nome, email),
          workflow_executions (
            id,
            status,
            current_node_id,
            started_at,
            completed_at,
            workflows (
              id,
              name,
              version,
              nodes,
              edges
            )
          )
        `)
        .eq('id', processo.id)
        .single();

      if (inscricaoError) {
        console.error('[PROCESS_DETAIL] ❌ Error loading inscricao:', inscricaoError);
        throw inscricaoError;
      }

      // Salvar dados da inscrição para exibição
      if (inscricao?.dados_inscricao) {
        console.log('[PROCESS_DETAIL] ✅ Dados da inscrição carregados:', inscricao.dados_inscricao);
        setDadosInscricao(inscricao.dados_inscricao);
      }

      if (!inscricao?.workflow_executions) {
        console.log("[PROCESS_DETAIL] ⚠️ No workflow linked to this inscription");
        setLoading(false);
        return;
      }

      console.log('[PROCESS_DETAIL] ✅ Workflow execution found:', {
        executionId: inscricao.workflow_executions.id,
        status: inscricao.workflow_executions.status,
        workflowName: inscricao.workflow_executions.workflows?.name
      });

      const execution = inscricao.workflow_executions;
      setWorkflowData(execution);

      // Buscar execuções de steps
      const { data: stepExecutions, error: stepsError } = await supabase
        .from('workflow_step_executions')
        .select('*')
        .eq('execution_id', execution.id)
        .order('started_at', { ascending: true });

      if (stepsError) throw stepsError;

      // Converter nodes do workflow em WorkflowSteps com dados reais de execução
      const nodes = execution.workflows.nodes as any[];
      
      // Criar mapa de execuções por node_id
      const executionMap = new Map(
        (stepExecutions || []).map(step => [step.node_id, step])
      );

      const steps: WorkflowStep[] = nodes
        .filter(node => node.data.type !== 'start' && node.data.type !== 'end')
        .map((node, index) => {
          const stepExecution = executionMap.get(node.id);
          return {
            id: node.id,
            name: node.data.label || node.data.type,
            type: node.data.type as any,
            order: index + 1,
            description: node.data.description || `Etapa: ${node.data.label}`,
            color: node.data.color || 'blue',
            icon: node.data.icon || 'Circle',
            // Adicionar dados reais de execução com type casting correto
            executionStatus: stepExecution?.status as 'pending' | 'running' | 'paused' | 'completed' | 'failed' | undefined,
            startedAt: stepExecution?.started_at,
            completedAt: stepExecution?.completed_at,
            errorMessage: stepExecution?.error_message,
          };
        });

      setWorkflowSteps(steps);
      setCurrentStepId(execution.current_node_id || steps[0]?.id || "");

      // Converter step executions em actions com dados reais
      const actions: WorkflowAction[] = (stepExecutions || []).map(step => ({
        id: step.id,
        workflowInstanceId: execution.id,
        stepId: step.node_id,
        action: step.status === 'completed' ? 'advance' : 
                step.status === 'failed' ? 'reject' : 'request_info',
        performedBy: step.status === 'completed' ? 'Sistema' : 'Pendente',
        performedAt: step.completed_at || step.started_at,
        comment: step.error_message || 
                 (step.status === 'paused' ? 'Aguardando ação' : undefined),
        metadata: {
          status: step.status,
          nodeType: step.node_type,
          inputData: step.input_data,
          outputData: step.output_data,
          duration: step.completed_at && step.started_at ? 
            Math.round((new Date(step.completed_at).getTime() - 
                       new Date(step.started_at).getTime()) / 1000) : null
        }
      }));

      setWorkflowActions(actions);

    } catch (error) {
      console.error('Erro ao carregar dados do workflow:', error);
      toast.error("Erro ao carregar dados do workflow");
    } finally {
      setLoading(false);
    }
  }


  const handleSolicitarInfo = () => {
    onStatusChange(processo.id, "pendente");
    toast.warning("Informações adicionais solicitadas");
    setActiveTab("mensagens");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed right-0 top-0 bottom-0 w-full lg:w-3/4 xl:w-2/3 bg-background border-l border-border shadow-2xl animate-slide-in-right overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur">
          <div className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground">{processo.nome}</h2>
                <StatusBadge status={processo.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-mono">{processo.protocolo}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{processo.especialidade}</span>
                <Separator orientation="vertical" className="h-4" />
                <span>{new Date(processo.dataSubmissao).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Action Buttons */}
          {(processo.status === "em_analise" || processo.status === "aguardando_analise") && (
            <div className="flex gap-3 px-6 pb-4">
              <Button
                onClick={() => setDecisaoDialogOpen(true)}
                className="gap-2"
                title="Registrar decisão formal com justificativa obrigatória"
              >
                <ClipboardCheck className="h-4 w-4" />
                Registrar Decisão
              </Button>
              <Button
                onClick={handleSolicitarInfo}
                variant="outline"
                className="border-orange-500/30 hover:bg-orange-500/10 text-orange-400 gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                Solicitar Informação
              </Button>
            </div>
          )}
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0 h-auto">
            <TabsTrigger
              value="dados"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
            >
              <FileText className="h-4 w-4" />
              Dados
            </TabsTrigger>
            <TabsTrigger
              value="workflow"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
            >
              <Workflow className="h-4 w-4" />
              Workflow
            </TabsTrigger>
            <TabsTrigger
              value="documentos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
            >
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger
              value="mensagens"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2 relative"
            >
              <MessageSquare className="h-4 w-4" />
              Mensagens
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center rounded-full animate-pulse"
                >
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3 gap-2"
            >
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="dados" className="m-0 p-6">
              <DadosInscricaoView dadosInscricao={dadosInscricao} />
            </TabsContent>

            <TabsContent value="workflow" className="m-0 p-6">
              <div className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : workflowSteps.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">
                          {workflowData?.workflows?.name || "Workflow"} 
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            v{workflowData?.workflows?.version}
                          </span>
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Status: {workflowData?.status === 'running' ? 'Em execução' : 
                                     workflowData?.status === 'completed' ? 'Concluído' : 
                                     workflowData?.status === 'failed' ? 'Falhou' : 'Aguardando'}
                          </span>
                          {workflowData?.started_at && (
                            <span>
                              Iniciado: {new Date(workflowData.started_at).toLocaleString('pt-BR')}
                            </span>
                          )}
                          {workflowData?.completed_at && (
                            <span>
                              Concluído: {new Date(workflowData.completed_at).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      {workflowData?.status && (
                        <Badge 
                          variant="outline"
                          className={
                            workflowData.status === 'running' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            workflowData.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            workflowData.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          }
                        >
                          {workflowData.status}
                        </Badge>
                      )}
                    </div>

                    {/* Métricas de Execução */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-lg bg-card border">
                        <div className="text-2xl font-bold text-foreground">
                          {workflowSteps.filter(s => s.executionStatus === 'completed').length}
                        </div>
                        <div className="text-xs text-muted-foreground">Steps Completados</div>
                      </div>
                      <div className="p-4 rounded-lg bg-card border">
                        <div className="text-2xl font-bold text-blue-400">
                          {workflowSteps.filter(s => s.executionStatus === 'running' || s.executionStatus === 'paused').length}
                        </div>
                        <div className="text-xs text-muted-foreground">Em Execução</div>
                      </div>
                      <div className="p-4 rounded-lg bg-card border">
                        <div className="text-2xl font-bold text-red-400">
                          {workflowSteps.filter(s => s.executionStatus === 'failed').length}
                        </div>
                        <div className="text-xs text-muted-foreground">Falhas</div>
                      </div>
                    </div>

                    <WorkflowTimeline
                      steps={workflowSteps}
                      currentStepId={currentStepId}
                      actions={workflowActions}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Sem Workflow Vinculado</h3>
                    <p className="text-sm text-muted-foreground">
                      Esta inscrição não possui um workflow automatizado configurado.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="documentos" className="m-0 p-6">
              <DocumentsTab 
                processoId={processo.id} 
                dadosInscricao={dadosInscricao}
              />
            </TabsContent>
            <TabsContent value="mensagens" className="m-0 p-6">
              <MessagesTab 
                processoId={processo.id} 
                candidatoNome={processo.nome}
                executionId={workflowData?.id}
                inscricaoId={processo.id}
                dadosInscricao={dadosInscricao}
              />
            </TabsContent>
            <TabsContent value="historico" className="m-0 p-6">
              <HistoryTab 
                processoId={processo.id}
                dadosInscricao={dadosInscricao}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Dialog de Decisão Formal */}
      <DecisaoDialog
        open={decisaoDialogOpen}
        onOpenChange={setDecisaoDialogOpen}
        inscricaoId={processo.id}
        analiseId={analiseId || processo.id}
        dadosInscricao={dadosInscricao || {}}
        documentos={[]}
      />
    </div>
  );
}
