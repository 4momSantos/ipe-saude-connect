import { CheckCircle, XCircle, AlertCircle, MessageSquare, FileText, User, Loader2, Clock } from "lucide-react";
import { useAuditLogsByResource } from "@/hooks/useAuditLogs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CandidatoInfoCard } from "./CandidatoInfoCard";

interface HistoryEvent {
  tipo: "aprovacao" | "rejeicao" | "solicitacao" | "comentario" | "upload" | "atribuicao" | "workflow" | "status_change" | "criacao";
  descricao: string;
  autor: string;
  data: string;
  metadata?: any;
}

export function HistoryTab({ processoId, dadosInscricao }: { 
  processoId: string;
  dadosInscricao?: any;
}) {
  // Buscar audit logs
  const { data: auditLogs, isLoading: loadingAudit } = useAuditLogsByResource('inscricoes_edital', processoId);
  
  // Buscar eventos do workflow
  const { data: workflowEvents, isLoading: loadingWorkflow } = useQuery({
    queryKey: ['workflow-history', processoId],
    queryFn: async () => {
      const { data: inscricao } = await supabase
        .from('inscricoes_edital')
        .select('workflow_execution_id')
        .eq('id', processoId)
        .single();

      if (!inscricao?.workflow_execution_id) return [];

      const { data: steps } = await supabase
        .from('workflow_step_executions')
        .select('*')
        .eq('execution_id', inscricao.workflow_execution_id)
        .order('created_at', { ascending: false });

      return steps || [];
    }
  });

  // Buscar mensagens
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['workflow-messages', processoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('workflow_messages')
        .select('*')
        .eq('inscricao_id', processoId)
        .order('created_at', { ascending: false });

      return data || [];
    }
  });

  // Buscar documentos
  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ['document-history', processoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('inscricao_documentos')
        .select('*')
        .eq('inscricao_id', processoId)
        .order('created_at', { ascending: false });

      return data || [];
    }
  });

  // Combinar todos os eventos
  const allEvents: HistoryEvent[] = [];

  // Adicionar audit logs
  if (auditLogs) {
    auditLogs.forEach(log => {
      let tipo: HistoryEvent['tipo'] = 'status_change';
      let descricao = log.action;

      if (log.action.includes('update')) {
        tipo = 'status_change';
        if (log.new_values?.status === 'aprovado') tipo = 'aprovacao';
        if (log.new_values?.status === 'inabilitado') tipo = 'rejeicao';
        descricao = `Status alterado para: ${log.new_values?.status || 'N/A'}`;
      } else if (log.action.includes('insert')) {
        tipo = 'criacao';
        descricao = 'Inscrição criada';
      }

      allEvents.push({
        tipo,
        descricao,
        autor: log.user_email || 'Sistema',
        data: log.created_at,
        metadata: log.metadata
      });
    });
  }

  // Adicionar eventos do workflow (apenas os que realmente executaram)
  if (workflowEvents) {
    workflowEvents.forEach(step => {
      // Só adicionar ao histórico se o step realmente foi iniciado ou completado
      if (!step.started_at && step.status === 'pending') {
        return; // Skip pending steps que nunca executaram
      }

      let tipo: HistoryEvent['tipo'] = 'workflow';
      let descricao = `${step.node_type}`;

      if (step.status === 'completed') {
        tipo = 'aprovacao';
        descricao = `✓ Etapa concluída: ${step.node_type}`;
      } else if (step.status === 'failed') {
        tipo = 'rejeicao';
        descricao = `✗ Etapa falhou: ${step.node_type}${step.error_message ? ' - ' + step.error_message : ''}`;
      } else if (step.status === 'paused') {
        tipo = 'solicitacao';
        descricao = `⏸ Etapa pausada: ${step.node_type}`;
      } else if (step.status === 'running' && step.started_at) {
        tipo = 'workflow';
        descricao = `▶ Iniciado: ${step.node_type}`;
      } else {
        // Se chegou aqui e não tem started_at, skip
        return;
      }

      allEvents.push({
        tipo,
        descricao,
        autor: 'Sistema Workflow',
        data: step.completed_at || step.started_at || step.created_at,
        metadata: step
      });
    });
  }

  // Adicionar mensagens
  if (messages) {
    messages.forEach(msg => {
      allEvents.push({
        tipo: 'comentario',
        descricao: msg.content,
        autor: msg.sender_type === 'system' ? 'Sistema' : 'Usuário',
        data: msg.created_at,
        metadata: msg
      });
    });
  }

  // Adicionar documentos
  if (documents) {
    documents.forEach(doc => {
      let tipo: HistoryEvent['tipo'] = 'upload';
      let descricao = `Documento enviado: ${doc.tipo_documento}`;

      if (doc.status === 'aprovado') {
        tipo = 'aprovacao';
        descricao = `✓ Documento aprovado: ${doc.tipo_documento}`;
      } else if (doc.status === 'rejeitado') {
        tipo = 'rejeicao';
        descricao = `✗ Documento rejeitado: ${doc.tipo_documento}`;
      }

      allEvents.push({
        tipo,
        descricao,
        autor: 'Sistema',
        data: doc.updated_at || doc.created_at,
        metadata: doc
      });
    });
  }

  // Ordenar por data (mais recente primeiro)
  allEvents.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

  const isLoading = loadingAudit || loadingWorkflow || loadingMessages || loadingDocs;

  const getIcon = (tipo: HistoryEvent["tipo"]) => {
    const icons = {
      criacao: <Clock className="h-5 w-5 text-blue-400" />,
      upload: <FileText className="h-5 w-5 text-purple-400" />,
      comentario: <MessageSquare className="h-5 w-5 text-blue-400" />,
      aprovacao: <CheckCircle className="h-5 w-5 text-green-400" />,
      rejeicao: <XCircle className="h-5 w-5 text-red-400" />,
      solicitacao: <AlertCircle className="h-5 w-5 text-orange-400" />,
      atribuicao: <User className="h-5 w-5 text-cyan-400" />,
      workflow: <Clock className="h-5 w-5 text-blue-400" />,
      status_change: <AlertCircle className="h-5 w-5 text-yellow-400" />,
    };
    return icons[tipo];
  };

  const getColor = (tipo: HistoryEvent["tipo"]) => {
    const colors = {
      criacao: "border-blue-500/30 bg-blue-500/5",
      upload: "border-purple-500/30 bg-purple-500/5",
      comentario: "border-blue-500/30 bg-blue-500/5",
      aprovacao: "border-green-500/30 bg-green-500/5",
      rejeicao: "border-red-500/30 bg-red-500/5",
      solicitacao: "border-orange-500/30 bg-orange-500/5",
      atribuicao: "border-cyan-500/30 bg-cyan-500/5",
      workflow: "border-blue-500/30 bg-blue-500/5",
      status_change: "border-yellow-500/30 bg-yellow-500/5",
    };
    return colors[tipo];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Sem Histórico</h3>
        <p className="text-sm text-muted-foreground">
          Nenhum evento registrado para esta inscrição ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CandidatoInfoCard dadosInscricao={dadosInscricao} />
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
        <div className="space-y-6">
          {allEvents.map((evento, index) => (
            <div key={index} className="relative flex gap-4">
              <div className={`relative z-10 rounded-full border-2 p-2 bg-background ${getColor(evento.tipo)}`}>
                {getIcon(evento.tipo)}
              </div>

              <div className="flex-1 pb-6">
                <div className="rounded-lg border bg-card p-4 hover-lift">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">{evento.descricao}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{evento.autor}</span>
                        <span>•</span>
                        <span>
                          {new Date(evento.data).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
