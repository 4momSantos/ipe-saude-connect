import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, CheckCircle, FileText, Workflow as WorkflowIcon, TrendingUp } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { WorkflowApprovalPanel } from "@/components/workflow/WorkflowApprovalPanel";

interface InscricaoPendente {
  id: string;
  status: string;
  created_at: string;
  candidato_id: string;
  editais: {
    titulo: string;
    especialidade: string | null;
  };
  profiles: {
    nome: string | null;
    email: string | null;
  };
}

export function DashboardAnalista() {
  const [inscricoesPendentes, setInscricoesPendentes] = useState<InscricaoPendente[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pendentes: 0,
    editais: 0,
    credenciados: 0,
    workflowsRunning: 0,
    workflowsCompleted: 0,
    approvalsPending: 0,
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Buscar inscrições pendentes
      const { data: inscricoes, error: inscricoesError } = await supabase
        .from('inscricoes_edital')
        .select(`
          id,
          status,
          created_at,
          candidato_id,
          editais (titulo, especialidade)
        `)
        .eq('status', 'em_analise')
        .order('created_at', { ascending: true })
        .limit(10);

      if (inscricoesError) throw inscricoesError;

      // Buscar perfis dos candidatos separadamente
      if (inscricoes && inscricoes.length > 0) {
        const candidatoIds = inscricoes.map(i => i.candidato_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .in('id', candidatoIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]));
        const inscricoesComPerfis = inscricoes.map(i => ({
          ...i,
          profiles: profilesMap.get(i.candidato_id) || { nome: null, email: null }
        }));
        setInscricoesPendentes(inscricoesComPerfis);
      }

      // Buscar estatísticas
      const { count: totalInscricoes } = await supabase
        .from('inscricoes_edital')
        .select('*', { count: 'exact', head: true });

      const { count: pendentes } = await supabase
        .from('inscricoes_edital')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'em_analise');

      const { count: editais } = await supabase
        .from('editais')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'aberto');

      const { count: credenciados } = await supabase
        .from('credenciados')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Ativo');

      // Buscar métricas de workflows
      const { count: workflowsRunning } = await supabase
        .from('workflow_executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running');

      const { count: workflowsCompleted } = await supabase
        .from('workflow_executions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const { count: approvalsPending } = await supabase
        .from('workflow_approvals')
        .select('*', { count: 'exact', head: true })
        .eq('decision', 'pending');

      setStats({
        total: totalInscricoes || 0,
        pendentes: pendentes || 0,
        editais: editais || 0,
        credenciados: credenciados || 0,
        workflowsRunning: workflowsRunning || 0,
        workflowsCompleted: workflowsCompleted || 0,
        approvalsPending: approvalsPending || 0,
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Painel do Analista</h1>
        <p className="text-muted-foreground">Gerencie análises e credenciamentos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Inscrições"
          value={stats.total}
          icon={Users}
          color="blue"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Pendentes de Análise"
          value={stats.pendentes}
          icon={Clock}
          color="orange"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Workflows em Execução"
          value={stats.workflowsRunning}
          icon={WorkflowIcon}
          color="purple"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Workflows Concluídos (30d)"
          value={stats.workflowsCompleted}
          icon={TrendingUp}
          color="green"
          trend={{ value: 0, isPositive: true }}
        />
      </div>

      {/* Seção de Aprovações Pendentes */}
      {stats.approvalsPending > 0 && (
        <WorkflowApprovalPanel />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Análises Pendentes</CardTitle>
          <CardDescription>
            Inscrições aguardando análise ({inscricoesPendentes.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {inscricoesPendentes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma análise pendente no momento.
            </p>
          ) : (
            <div className="space-y-4">
              {inscricoesPendentes.map((inscricao) => (
                <div
                  key={inscricao.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate('/analises')}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {inscricao.editais.titulo}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Candidato: {inscricao.profiles?.nome || inscricao.profiles?.email || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inscrito em: {format(new Date(inscricao.created_at), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                  <StatusBadge status={inscricao.status as any} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
