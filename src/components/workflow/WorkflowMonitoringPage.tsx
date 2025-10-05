// FASE 12-15: Página de monitoramento completa
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowTimeline } from "./WorkflowTimeline";
import { 
  Search, 
  Filter, 
  Eye, 
  MessageSquare,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowExecution {
  id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  workflow: {
    name: string;
  };
  inscricoes_edital: {
    id: string;
    candidato: {
      nome: string;
      email: string;
    };
    edital: {
      titulo: string;
    };
    unread_messages?: number;
  }[];
}

const statusConfig = {
  running: { 
    label: 'Em Execução', 
    color: 'bg-primary text-primary-foreground', 
    icon: Loader2 
  },
  completed: { 
    label: 'Concluído', 
    color: 'bg-emerald-500 text-white', 
    icon: CheckCircle2 
  },
  failed: { 
    label: 'Falhou', 
    color: 'bg-destructive text-destructive-foreground', 
    icon: XCircle 
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-secondary text-secondary-foreground', 
    icon: AlertCircle 
  },
};

export function WorkflowMonitoringPage() {
  const navigate = useNavigate();
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  useEffect(() => {
    loadExecutions();

    // Real-time subscription
    const channel = supabase
      .channel('workflow-monitoring')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_executions',
        },
        () => {
          loadExecutions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow:workflows (name),
          inscricoes_edital (
            id,
            candidato:profiles!inscricoes_edital_candidato_id_fkey (
              nome,
              email
            ),
            edital:editais (
              titulo
            )
          )
        `)
        .order('started_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Buscar mensagens não lidas para cada inscrição
      const executionsWithMessages = await Promise.all(
        (data || []).map(async (exec: any) => {
          if (exec.inscricoes_edital && exec.inscricoes_edital.length > 0) {
            const inscricaoId = exec.inscricoes_edital[0].id;
            const { count } = await supabase
              .from('workflow_messages')
              .select('*', { count: 'exact', head: true })
              .eq('inscricao_id', inscricaoId)
              .eq('is_read', false);

            return {
              ...exec,
              inscricoes_edital: exec.inscricoes_edital.map((i: any) => ({
                ...i,
                unread_messages: count || 0,
              })),
            };
          }
          return exec;
        })
      );

      setExecutions(executionsWithMessages);
    } catch (error) {
      console.error('Erro ao carregar execuções:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExecutions = executions.filter((exec) => {
    const matchesSearch = 
      exec.workflow?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.inscricoes_edital?.[0]?.candidato?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exec.inscricoes_edital?.[0]?.edital?.titulo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || exec.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoramento de Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o progresso de todas as execuções em tempo real
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {filteredExecutions.length} execuções
        </Badge>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por candidato, edital ou workflow..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="running">Em Execução</SelectItem>
              <SelectItem value="completed">Concluídos</SelectItem>
              <SelectItem value="failed">Falhados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Lista de Execuções */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          {filteredExecutions.map((exec) => {
            const config = statusConfig[exec.status as keyof typeof statusConfig] || statusConfig.running;
            const Icon = config.icon;
            const inscricao = exec.inscricoes_edital?.[0];
            const unreadCount = inscricao?.unread_messages || 0;

            return (
              <Card 
                key={exec.id}
                className={cn(
                  "p-4 cursor-pointer transition-all hover:shadow-md",
                  selectedExecution === exec.id && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedExecution(exec.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn(
                      "h-5 w-5",
                      exec.status === 'running' && "animate-spin"
                    )} />
                    <h3 className="font-semibold">{exec.workflow?.name || 'Workflow'}</h3>
                  </div>
                  <Badge className={config.color}>
                    {config.label}
                  </Badge>
                </div>

                {inscricao && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Candidato:</span>{' '}
                      <span className="font-medium">{inscricao.candidato?.nome}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Edital:</span>{' '}
                      <span>{inscricao.edital?.titulo}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Iniciado:</span>{' '}
                      <span>{new Date(exec.started_at).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                )}

                {exec.error_message && (
                  <div className="mt-3 p-2 rounded bg-destructive/10 text-destructive text-sm">
                    {exec.error_message}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/analises/${inscricao?.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Detalhes
                  </Button>
                  {inscricao && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="relative"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/analises/${inscricao.id}?tab=messages`);
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Chat
                      {unreadCount > 0 && (
                        <Badge 
                          variant="destructive" 
                          className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                        >
                          {unreadCount}
                        </Badge>
                      )}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}

          {filteredExecutions.length === 0 && (
            <Card className="p-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma execução encontrada</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros de busca'
                  : 'As execuções de workflow aparecerão aqui'}
              </p>
            </Card>
          )}
        </div>

        {/* Timeline do workflow selecionado */}
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-8rem)]">
          {selectedExecution ? (
            <WorkflowTimeline execution_id={selectedExecution} />
          ) : (
            <Card className="p-12 h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4" />
                <p>Selecione uma execução para ver a timeline</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
