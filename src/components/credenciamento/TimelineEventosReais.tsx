import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  PenTool, 
  Upload,
  AlertCircle,
  UserCheck,
  FileCheck,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimelineEventosReaisProps {
  inscricaoId: string;
  statusAtual: string;
}

interface EventoInscricao {
  id: string;
  tipo_evento: string;
  descricao: string;
  timestamp: string;
  dados: any;
  usuario_id: string | null;
}

interface MarcoProgresso {
  id: string;
  titulo: string;
  descricao: string;
  icon: any;
  status: "completo" | "em_progresso" | "pendente";
  timestamp?: string;
  eventos: EventoInscricao[];
}

export function TimelineEventosReais({ inscricaoId, statusAtual }: TimelineEventosReaisProps) {
  const [eventos, setEventos] = useState<EventoInscricao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarEventos();

    // Configurar realtime para atualizações automáticas
    const channel = supabase
      .channel(`inscricao-eventos-${inscricaoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inscricao_eventos',
          filter: `inscricao_id=eq.${inscricaoId}`
        },
        () => {
          console.log('[Realtime] Evento detectado, recarregando...');
          carregarEventos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId]);

  async function carregarEventos() {
    try {
      const { data, error } = await supabase
        .from('inscricao_eventos')
        .select('*')
        .eq('inscricao_id', inscricaoId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Erro ao carregar eventos:', error);
        return;
      }

      setEventos(data || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
    } finally {
      setLoading(false);
    }
  }

  // Processar eventos em marcos de progresso
  const processarMarcos = (): MarcoProgresso[] => {
    const marcos: MarcoProgresso[] = [];

    // Marco 1: Inscrição Iniciada
    const eventosInscricao = eventos.filter(e => 
      e.tipo_evento === 'inscricao_criada' || 
      e.tipo_evento === 'documento_enviado'
    );
    
    if (eventosInscricao.length > 0) {
      marcos.push({
        id: 'inscricao',
        titulo: 'Inscrição Iniciada',
        descricao: `${eventosInscricao.filter(e => e.tipo_evento === 'documento_enviado').length} documento(s) enviado(s)`,
        icon: Upload,
        status: 'completo',
        timestamp: eventosInscricao[0].timestamp,
        eventos: eventosInscricao
      });
    }

    // Marco 2: Documentação Completa
    const todosDocumentosEnviados = eventos.some(e => 
      e.tipo_evento === 'status_alterado' && 
      e.dados?.status_novo !== 'rascunho'
    );
    
    if (todosDocumentosEnviados) {
      const eventoFinalizacao = eventos.find(e => 
        e.tipo_evento === 'status_alterado' && 
        e.dados?.status_anterior === 'rascunho'
      );
      
      marcos.push({
        id: 'documentacao',
        titulo: 'Documentação Completa',
        descricao: 'Todos os documentos foram enviados',
        icon: FileCheck,
        status: 'completo',
        timestamp: eventoFinalizacao?.timestamp || eventosInscricao[eventosInscricao.length - 1]?.timestamp,
        eventos: [eventoFinalizacao].filter(Boolean) as EventoInscricao[]
      });
    }

    // Marco 3: Em Análise
    const eventosAnalise = eventos.filter(e => 
      e.tipo_evento === 'documento_validado' ||
      (e.tipo_evento === 'status_alterado' && e.dados?.status_novo === 'em_analise')
    );
    
    if (eventosAnalise.length > 0 || statusAtual === 'em_analise') {
      const documentosValidados = eventos.filter(e => e.tipo_evento === 'documento_validado');
      marcos.push({
        id: 'analise',
        titulo: 'Análise Técnica',
        descricao: documentosValidados.length > 0 
          ? `${documentosValidados.length} documento(s) validado(s)` 
          : 'Documentos em análise pela equipe',
        icon: FileText,
        status: statusAtual === 'em_analise' ? 'em_progresso' : 'completo',
        timestamp: eventosAnalise[0]?.timestamp,
        eventos: eventosAnalise
      });
    }

    // Marco 4: Aprovado
    const eventoAprovacao = eventos.find(e => 
      e.tipo_evento === 'status_alterado' && 
      e.dados?.status_novo === 'aprovado'
    );
    
    if (eventoAprovacao || statusAtual === 'aprovado' || 
        statusAtual === 'aguardando_assinatura' || 
        statusAtual === 'assinado' || 
        statusAtual === 'ativo') {
      marcos.push({
        id: 'aprovado',
        titulo: 'Credenciamento Aprovado',
        descricao: 'Documentação aprovada pela equipe técnica',
        icon: CheckCircle2,
        status: 'completo',
        timestamp: eventoAprovacao?.timestamp,
        eventos: eventoAprovacao ? [eventoAprovacao] : []
      });
    }

    // Marco 5: Aguardando Assinatura
    if (statusAtual === 'aguardando_assinatura' || 
        statusAtual === 'assinado' || 
        statusAtual === 'ativo') {
      marcos.push({
        id: 'assinatura',
        titulo: 'Aguardando Assinatura',
        descricao: 'Contrato pronto para assinatura',
        icon: PenTool,
        status: statusAtual === 'aguardando_assinatura' ? 'em_progresso' : 'completo',
        timestamp: undefined,
        eventos: []
      });
    }

    // Marco 6: Contrato Assinado
    const eventoAssinatura = eventos.find(e => 
      e.tipo_evento === 'status_alterado' && 
      e.dados?.status_novo === 'assinado'
    );
    
    if (eventoAssinatura || statusAtual === 'assinado' || statusAtual === 'ativo') {
      marcos.push({
        id: 'assinado',
        titulo: 'Contrato Assinado',
        descricao: 'Contrato assinado com sucesso',
        icon: UserCheck,
        status: statusAtual === 'assinado' ? 'em_progresso' : statusAtual === 'ativo' ? 'completo' : 'completo',
        timestamp: eventoAssinatura?.timestamp,
        eventos: eventoAssinatura ? [eventoAssinatura] : []
      });
    }

    // Marco 7: Credenciamento Ativo
    const eventoAtivacao = eventos.find(e => 
      e.tipo_evento === 'status_alterado' && 
      e.dados?.status_novo === 'ativo'
    );
    
    if (eventoAtivacao || statusAtual === 'ativo') {
      marcos.push({
        id: 'ativo',
        titulo: 'Credenciamento Ativo',
        descricao: 'Prestador credenciado e ativo no sistema',
        icon: TrendingUp,
        status: statusAtual === 'ativo' ? 'completo' : 'em_progresso',
        timestamp: eventoAtivacao?.timestamp,
        eventos: eventoAtivacao ? [eventoAtivacao] : []
      });
    }

    // Se nenhum marco foi adicionado ainda, adicionar estado inicial
    if (marcos.length === 0) {
      marcos.push({
        id: 'inicio',
        titulo: 'Processo Iniciado',
        descricao: 'Aguardando envio de documentos',
        icon: Clock,
        status: 'em_progresso',
        timestamp: undefined,
        eventos: []
      });
    }

    return marcos;
  };

  const marcos = processarMarcos();
  const marcoAtual = marcos.findIndex(m => m.status === 'em_progresso');
  const progresso = marcoAtual >= 0 
    ? ((marcoAtual + 1) / marcos.length) * 100 
    : (marcos.filter(m => m.status === 'completo').length / marcos.length) * 100;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Carregando timeline...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Indicador de Progresso Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Progresso do Credenciamento</span>
            <Badge variant="outline" className="text-base">
              {Math.round(progresso)}%
            </Badge>
          </CardTitle>
          <CardDescription>
            Baseado em {eventos.length} evento(s) registrado(s) no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[hsl(var(--blue-primary))] via-[hsl(var(--green-approved))] to-[hsl(var(--green-approved))] transition-all duration-1000 ease-out"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeline de Marcos */}
      <div className="relative space-y-8">
        {/* Linha vertical conectora */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-border" />
        
        {marcos.map((marco, index) => {
          const Icon = marco.icon;
          const isCompleto = marco.status === 'completo';
          const isEmProgresso = marco.status === 'em_progresso';
          
          return (
            <div key={marco.id} className="relative pl-16 animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              {/* Ícone do Marco */}
              <div 
                className={cn(
                  "absolute left-0 w-12 h-12 rounded-full flex items-center justify-center border-4 border-background z-10 transition-all duration-500",
                  isCompleto && "bg-[hsl(var(--green-approved))] shadow-lg",
                  isEmProgresso && "bg-primary animate-pulse shadow-xl",
                  !isCompleto && !isEmProgresso && "bg-muted"
                )}
              >
                <Icon className={cn(
                  "w-6 h-6",
                  isCompleto && "text-white",
                  isEmProgresso && "text-white",
                  !isCompleto && !isEmProgresso && "text-muted-foreground"
                )} />
              </div>

              {/* Card do Marco */}
              <Card className={cn(
                "transition-all duration-500",
                isEmProgresso && "ring-2 ring-primary shadow-xl scale-105"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {marco.titulo}
                        {isCompleto && <CheckCircle2 className="w-5 h-5 text-[hsl(var(--green-approved))]" />}
                        {isEmProgresso && <Clock className="w-5 h-5 text-primary animate-pulse" />}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {marco.descricao}
                      </CardDescription>
                    </div>
                    {marco.timestamp && (
                      <Badge variant="outline" className="ml-4">
                        {format(new Date(marco.timestamp), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                {/* Detalhes dos Eventos */}
                {marco.eventos.length > 0 && (
                  <CardContent className="pt-0">
                    <Separator className="mb-3" />
                    <div className="space-y-2">
                      {marco.eventos.slice(0, 3).map((evento) => (
                        <div key={evento.id} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                          <div className="flex-1">
                            <p className="text-muted-foreground">{evento.descricao}</p>
                            {evento.timestamp && (
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(evento.timestamp), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      {marco.eventos.length > 3 && (
                        <p className="text-xs text-muted-foreground pl-3.5">
                          + {marco.eventos.length - 3} evento(s) adicional(is)
                        </p>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Logs Detalhados de Todos os Eventos */}
      {eventos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Log Completo de Eventos
            </CardTitle>
            <CardDescription>
              Histórico completo de {eventos.length} evento(s) registrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {eventos.slice().reverse().map((evento) => (
                <div key={evento.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{evento.descricao}</p>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {evento.tipo_evento.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(evento.timestamp), "dd/MM/yy 'às' HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
