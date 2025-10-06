import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, CheckCircle, XCircle, Edit, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { RetryWorkflowDialog } from '@/components/inscricao/RetryWorkflowDialog';
import { InscricaoCard } from '@/components/inscricao/InscricaoCard';

interface Inscricao {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_rascunho: boolean;
  edital_id: string;
  workflow_execution_id: string | null;
  retry_count: number;
  editais: {
    titulo: string;
    numero_edital: string | null;
  } | null;
  workflow_executions?: {
    status: string;
    error_message: string | null;
  } | null;
}

export default function MinhasInscricoes() {
  const [rascunhos, setRascunhos] = useState<Inscricao[]>([]);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryDialogOpen, setRetryDialogOpen] = useState(false);
  const [selectedInscricao, setSelectedInscricao] = useState<Inscricao | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadInscricoes();
  }, []);

  async function loadInscricoes() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[MINHAS_INSCRICOES] Usuário não autenticado');
        return;
      }

      console.log('[MINHAS_INSCRICOES] User ID:', user.id);

      // Buscar rascunhos
      console.log('[MINHAS_INSCRICOES] Buscando rascunhos...');
      const { data: rascunhosData, error: rascunhosError } = await supabase
        .from('inscricoes_edital')
        .select(`
          *,
          editais (
            titulo,
            numero_edital
          )
        `)
        .eq('candidato_id', user.id)
        .eq('is_rascunho', true)
        .order('updated_at', { ascending: false });

      if (rascunhosError) {
        console.error('[MINHAS_INSCRICOES] ❌ Erro ao buscar rascunhos:', rascunhosError);
        throw rascunhosError;
      }
      
      console.log('[MINHAS_INSCRICOES] ✅ Rascunhos encontrados:', rascunhosData?.length || 0);

      // Buscar inscrições enviadas com status do workflow
      console.log('[MINHAS_INSCRICOES] Buscando inscrições enviadas...');
      const { data: inscricoesData, error: inscricoesError } = await supabase
        .from('inscricoes_edital')
        .select(`
          *,
          editais (
            titulo,
            numero_edital
          ),
          workflow_executions (
            status,
            error_message
          )
        `)
        .eq('candidato_id', user.id)
        .eq('is_rascunho', false)
        .order('created_at', { ascending: false });

      if (inscricoesError) {
        console.error('[MINHAS_INSCRICOES] ❌ Erro ao buscar inscrições:', inscricoesError);
        throw inscricoesError;
      }
      
      console.log('[MINHAS_INSCRICOES] ✅ Inscrições enviadas encontradas:', inscricoesData?.length || 0);

      setRascunhos(rascunhosData || []);
      setInscricoes(inscricoesData || []);
    } catch (error: any) {
      console.error('[MINHAS_INSCRICOES] ❌ Erro geral:', error);
      toast.error('Erro ao carregar inscrições: ' + (error.message || 'Tente novamente'));
    } finally {
      setLoading(false);
    }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const configs: Record<string, any> = {
      rascunho: { color: 'bg-yellow-500', icon: Edit, label: 'Rascunho' },
      em_analise: { color: 'bg-blue-500', icon: Clock, label: 'Em Análise' },
      aprovado: { color: 'bg-green-500', icon: CheckCircle, label: 'Aprovado' },
      rejeitado: { color: 'bg-red-500', icon: XCircle, label: 'Rejeitado' },
      credenciado: { color: 'bg-green-600', icon: CheckCircle, label: 'Credenciado' }
    };

    const config = configs[status] || { color: 'bg-gray-500', icon: FileText, label: status };
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white flex items-center gap-1`}>
        <Icon size={14} />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Minhas Inscrições</h1>
        <Button onClick={() => navigate('/editais')}>
          Ver Editais Disponíveis
        </Button>
      </div>

      {/* Rascunhos */}
      {rascunhos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Edit className="h-5 w-5 text-yellow-500" />
            Rascunhos ({rascunhos.length})
          </h2>
          <div className="grid gap-4">
            {rascunhos.map((rascunho) => (
              <Card key={rascunho.id} className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {rascunho.editais?.titulo || 'Edital não encontrado'}
                    </CardTitle>
                    <StatusBadge status="rascunho" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Última edição: {formatDistanceToNow(new Date(rascunho.updated_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </p>
                  <Button onClick={() => navigate(`/editais`)}>
                    <Edit className="mr-2" size={16} />
                    Continuar Inscrição
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Inscrições Enviadas */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Inscrições Enviadas ({inscricoes.length})
        </h2>
        <div className="grid gap-4">
          {inscricoes.map((inscricao) => (
            <InscricaoCard
              key={inscricao.id}
              inscricao={inscricao}
              onRetry={() => {
                setSelectedInscricao(inscricao);
                setRetryDialogOpen(true);
              }}
              onView={() => navigate(`/analises`)}
            />
          ))}
          {inscricoes.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma inscrição enviada ainda
            </p>
          )}
        </div>
        
        {selectedInscricao && (
          <RetryWorkflowDialog
            open={retryDialogOpen}
            onOpenChange={setRetryDialogOpen}
            inscricaoId={selectedInscricao.id}
            errorMessage={selectedInscricao.workflow_executions?.error_message || undefined}
            retryCount={selectedInscricao.retry_count}
          />
        )}
      </div>
    </div>
  );
}
