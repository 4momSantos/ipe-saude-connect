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
    const iconProps = "h-6 w-6";
    const icons = {
      criacao: <Clock className={`${iconProps} text-blue-500`} strokeWidth={2.5} />,
      upload: <FileText className={`${iconProps} text-purple-500`} strokeWidth={2.5} />,
      comentario: <MessageSquare className={`${iconProps} text-blue-500`} strokeWidth={2.5} />,
      aprovacao: <CheckCircle className={`${iconProps} text-green-500`} strokeWidth={2.5} />,
      rejeicao: <XCircle className={`${iconProps} text-red-500`} strokeWidth={2.5} />,
      solicitacao: <AlertCircle className={`${iconProps} text-orange-500`} strokeWidth={2.5} />,
      atribuicao: <User className={`${iconProps} text-cyan-500`} strokeWidth={2.5} />,
      workflow: <Clock className={`${iconProps} text-indigo-500`} strokeWidth={2.5} />,
      status_change: <AlertCircle className={`${iconProps} text-yellow-500`} strokeWidth={2.5} />,
    };
    return icons[tipo];
  };

  const getColor = (tipo: HistoryEvent["tipo"]) => {
    const colors = {
      criacao: "border-blue-500/40 bg-gradient-to-br from-blue-500/10 to-blue-600/5 shadow-lg shadow-blue-500/20",
      upload: "border-purple-500/40 bg-gradient-to-br from-purple-500/10 to-purple-600/5 shadow-lg shadow-purple-500/20",
      comentario: "border-blue-500/40 bg-gradient-to-br from-blue-500/10 to-blue-600/5 shadow-lg shadow-blue-500/20",
      aprovacao: "border-green-500/40 bg-gradient-to-br from-green-500/10 to-green-600/5 shadow-lg shadow-green-500/20",
      rejeicao: "border-red-500/40 bg-gradient-to-br from-red-500/10 to-red-600/5 shadow-lg shadow-red-500/20",
      solicitacao: "border-orange-500/40 bg-gradient-to-br from-orange-500/10 to-orange-600/5 shadow-lg shadow-orange-500/20",
      atribuicao: "border-cyan-500/40 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 shadow-lg shadow-cyan-500/20",
      workflow: "border-indigo-500/40 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 shadow-lg shadow-indigo-500/20",
      status_change: "border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 shadow-lg shadow-yellow-500/20",
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
        <div className="absolute left-7 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/60 via-primary/30 to-transparent rounded-full" />
        <div className="space-y-8">
          {allEvents.map((evento, index) => (
            <div 
              key={index} 
              className="relative flex gap-6 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`relative z-10 rounded-full border-2 p-3.5 bg-card/80 backdrop-blur-xl transition-all duration-500 hover:scale-125 hover:rotate-12 ${getColor(evento.tipo)}`}>
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
                {getIcon(evento.tipo)}
              </div>

              <div className="flex-1 pb-8">
                <div className="group relative rounded-xl border border-border/50 bg-gradient-to-br from-card via-card to-card/50 p-5 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:border-primary/40 hover:-translate-y-1">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <p className="font-semibold text-foreground text-base leading-relaxed">{evento.descricao}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-medium">{evento.autor}</span>
                        <span className="opacity-50">•</span>
                        <span className="font-mono text-xs">
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
