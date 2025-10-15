import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ArrowLeft, FileText, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusBadge } from '@/components/StatusBadge';

export default function DetalhesInscricao() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: inscricao, isLoading } = useQuery({
    queryKey: ['inscricao-detalhes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricoes_edital')
        .select(`
          *,
          editais (
            titulo,
            numero_edital,
            descricao
          ),
          workflow_executions (
            status,
            started_at,
            completed_at,
            error_message
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!inscricao) {
    return (
      <div className="container mx-auto p-8">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Inscrição não encontrada</p>
            <Button 
              onClick={() => navigate('/minhas-inscricoes')} 
              className="mt-4"
            >
              Voltar para Minhas Inscrições
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 space-y-6">
      {/* Header com botão voltar */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/minhas-inscricoes')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>

      {/* Card Principal com Protocolo */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="space-y-2 flex-1">
              <CardTitle className="text-2xl">
                {inscricao.editais?.titulo || 'Edital não encontrado'}
              </CardTitle>
              
              {/* Protocolo em destaque */}
              {inscricao.protocolo && (
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Protocolo:</span>
                  <Badge variant="outline" className="font-mono text-base px-3 py-1">
                    {inscricao.protocolo}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(inscricao.protocolo!);
                      toast.success('Protocolo copiado para área de transferência!');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <StatusBadge status={inscricao.status as any} />
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Data de envio */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Enviado em:</span>
            <span className="font-medium">
              {format(new Date(inscricao.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
          </div>

          {/* Informações do Edital */}
          {inscricao.editais?.numero_edital && (
            <div className="text-sm">
              <span className="text-muted-foreground">Número do Edital:</span>
              <span className="ml-2 font-medium">{inscricao.editais.numero_edital}</span>
            </div>
          )}

          {inscricao.editais?.descricao && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Sobre o Edital</h3>
              <p className="text-sm text-muted-foreground">{inscricao.editais.descricao}</p>
            </div>
          )}

          {/* Timeline do Workflow (se existir) */}
          {inscricao.workflow_executions && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Status do Processo</h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Iniciado em:</span>
                  <span className="ml-2">
                    {inscricao.workflow_executions.started_at 
                      ? format(new Date(inscricao.workflow_executions.started_at), "dd/MM/yyyy HH:mm")
                      : 'Aguardando início'}
                  </span>
                </p>
                {inscricao.workflow_executions.completed_at && (
                  <p>
                    <span className="text-muted-foreground">Concluído em:</span>
                    <span className="ml-2">
                      {format(new Date(inscricao.workflow_executions.completed_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </p>
                )}
                {inscricao.workflow_executions.error_message && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-2">
                    <p className="text-sm text-destructive">
                      <strong>Erro:</strong> {inscricao.workflow_executions.error_message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botão para ver processo completo */}
          <Button 
            onClick={() => navigate(`/analises`)}
            className="w-full"
          >
            Ver Detalhes do Processo
          </Button>
        </CardContent>
      </Card>

      {/* Card com informações adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações da Inscrição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Status atual:</span>
              <div className="mt-1">
                <StatusBadge status={inscricao.status as any} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Data de criação:</span>
              <p className="font-medium mt-1">
                {format(new Date(inscricao.created_at), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Última atualização:</span>
              <p className="font-medium mt-1">
                {format(new Date(inscricao.updated_at), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
            {inscricao.protocolo && (
              <div>
                <span className="text-muted-foreground">Protocolo:</span>
                <p className="font-mono font-medium mt-1">{inscricao.protocolo}</p>
              </div>
            )}
          </div>

          {inscricao.motivo_rejeicao && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2 text-destructive">Motivo da Rejeição</h3>
              <p className="text-sm">{inscricao.motivo_rejeicao}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
