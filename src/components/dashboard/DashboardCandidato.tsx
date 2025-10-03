import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MetricCard } from "@/components/MetricCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";

interface Inscricao {
  id: string;
  status: string;
  created_at: string;
  editais: {
    titulo: string;
    especialidade: string | null;
  };
}

export function DashboardCandidato() {
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInscricoes();
  }, []);

  async function loadInscricoes() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('inscricoes_edital')
        .select(`
          id,
          status,
          created_at,
          editais (titulo, especialidade)
        `)
        .eq('candidato_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInscricoes(data || []);
    } catch (error) {
      console.error('Erro ao carregar inscrições:', error);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    total: inscricoes.length,
    em_analise: inscricoes.filter(i => i.status === 'em_analise').length,
    aprovadas: inscricoes.filter(i => i.status === 'aprovado').length,
    rejeitadas: inscricoes.filter(i => i.status === 'rejeitado').length,
  };

  if (loading) {
    return <div className="text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Minhas Inscrições</h1>
        <p className="text-muted-foreground">Acompanhe o status das suas candidaturas</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Inscrições"
          value={stats.total}
          icon={FileText}
          color="blue"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Em Análise"
          value={stats.em_analise}
          icon={Clock}
          color="orange"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Aprovadas"
          value={stats.aprovadas}
          icon={CheckCircle}
          color="green"
          trend={{ value: 0, isPositive: true }}
        />
        <MetricCard
          title="Rejeitadas"
          value={stats.rejeitadas}
          icon={XCircle}
          color="red"
          trend={{ value: 0, isPositive: false }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Inscrições</CardTitle>
          <CardDescription>Histórico das suas candidaturas</CardDescription>
        </CardHeader>
        <CardContent>
          {inscricoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Você ainda não possui inscrições. Acesse a página de Editais para se candidatar.
            </p>
          ) : (
            <div className="space-y-4">
              {inscricoes.map((inscricao) => (
                <div
                  key={inscricao.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {inscricao.editais.titulo}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {inscricao.editais.especialidade || 'Sem especialidade'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Inscrito em: {format(new Date(inscricao.created_at), 'dd/MM/yyyy')}
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
