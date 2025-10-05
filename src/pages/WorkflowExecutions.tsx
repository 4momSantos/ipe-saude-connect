import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, MessageCircle, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface WorkflowExecution {
  id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  current_node_id: string | null;
  inscricao_id: string;
  candidato_nome: string;
  unread_messages: number;
}

export default function WorkflowExecutions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workflowId = searchParams.get("id");
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutions();
  }, [workflowId]);

  const loadExecutions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('workflow_executions')
        .select(`
          id,
          status,
          started_at,
          completed_at,
          current_node_id,
          workflows (name),
          inscricoes_edital!inner (
            id,
            profiles (nome, email)
          )
        `)
        .order('started_at', { ascending: false });

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar contagem de mensagens não lidas para cada execução
      const executionsWithMessages = await Promise.all(
        (data || []).map(async (exec: any) => {
          const { count } = await supabase
            .from('workflow_messages')
            .select('*', { count: 'exact', head: true })
            .eq('execution_id', exec.id)
            .eq('is_read', false);

          return {
            id: exec.id,
            workflow_name: exec.workflows?.name || 'Workflow',
            status: exec.status,
            started_at: exec.started_at,
            completed_at: exec.completed_at,
            current_node_id: exec.current_node_id,
            inscricao_id: exec.inscricoes_edital.id,
            candidato_nome: exec.inscricoes_edital.profiles?.nome || 
                            exec.inscricoes_edital.profiles?.email || 
                            'Sem nome',
            unread_messages: count || 0
          };
        })
      );

      setExecutions(executionsWithMessages);
    } catch (error) {
      console.error('Erro ao carregar execuções:', error);
      toast.error('Erro ao carregar execuções');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Em Execução
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            Falhou
          </Badge>
        );
      case 'paused':
        return (
          <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">
            <Clock className="h-3 w-3 mr-1" />
            Pausado
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Carregando execuções...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/workflows")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Execuções de Workflow
            </h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Monitore o progresso das execuções de workflow em tempo real
          </p>
        </div>
      </div>

      <Card className="border bg-card">
        <CardHeader>
          <CardTitle>Histórico de Execuções</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma execução encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Candidato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Iniciado em</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>Mensagens</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((execution) => {
                    const duration = execution.completed_at
                      ? Math.round(
                          (new Date(execution.completed_at).getTime() -
                            new Date(execution.started_at).getTime()) /
                            1000
                        )
                      : Math.round(
                          (new Date().getTime() -
                            new Date(execution.started_at).getTime()) /
                            1000
                        );

                    return (
                      <TableRow
                        key={execution.id}
                        className="hover:bg-card/50 cursor-pointer"
                      >
                        <TableCell className="font-medium">
                          {execution.workflow_name}
                        </TableCell>
                        <TableCell>{execution.candidato_nome}</TableCell>
                        <TableCell>{getStatusBadge(execution.status)}</TableCell>
                        <TableCell>
                          {new Date(execution.started_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {duration < 60
                            ? `${duration}s`
                            : `${Math.floor(duration / 60)}m ${duration % 60}s`}
                        </TableCell>
                        <TableCell>
                          {execution.unread_messages > 0 ? (
                            <Badge variant="destructive" className="animate-pulse">
                              <MessageCircle className="h-3 w-3 mr-1" />
                              {execution.unread_messages} nova(s)
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Sem mensagens
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                navigate(`/analises?inscricao=${execution.inscricao_id}`)
                              }
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalhes
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
