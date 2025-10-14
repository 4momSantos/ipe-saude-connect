import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, FileText, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SituacaoCadastralProps {
  credenciadoId: string;
}

export function SituacaoCadastralDashboard({ credenciadoId }: SituacaoCadastralProps) {
  const { data: credenciado, isLoading: loadingCredenciado } = useQuery({
    queryKey: ['credenciado-situacao', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credenciados')
        .select('*')
        .eq('id', credenciadoId)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: historico } = useQuery({
    queryKey: ['historico-status', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_status_credenciado')
        .select('*')
        .eq('credenciado_id', credenciadoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: prazos } = useQuery({
    queryKey: ['prazos-credenciado', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prazos_credenciamento')
        .select('*')
        .eq('credenciado_id', credenciadoId)
        .eq('status', 'ativo')
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Ativo':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Suspenso':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'Inativo':
      case 'Descredenciado':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ativo':
        return 'bg-green-500';
      case 'Suspenso':
        return 'bg-yellow-500';
      case 'Inativo':
      case 'Descredenciado':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getPrazoUrgencia = (dataVencimento: string) => {
    const dias = Math.ceil((new Date(dataVencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (dias < 0) return { label: 'VENCIDO', color: 'bg-red-500' };
    if (dias <= 7) return { label: `${dias} dias`, color: 'bg-red-500' };
    if (dias <= 15) return { label: `${dias} dias`, color: 'bg-yellow-500' };
    if (dias <= 30) return { label: `${dias} dias`, color: 'bg-blue-500' };
    return { label: `${dias} dias`, color: 'bg-gray-500' };
  };

  if (loadingCredenciado) {
    return <div className="text-center py-8">Carregando situação cadastral...</div>;
  }

  if (!credenciado) {
    return <div className="text-center py-8">Credenciado não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      {/* Status Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon(credenciado.status)}
            Situação Cadastral Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge className={getStatusColor(credenciado.status)}>
                {credenciado.status}
              </Badge>
              {credenciado.status === 'Suspenso' && credenciado.suspensao_fim && (
                <p className="text-sm text-muted-foreground mt-2">
                  Suspensão até: {format(new Date(credenciado.suspensao_fim), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
              {credenciado.motivo_suspensao && (
                <p className="text-sm mt-2">
                  <strong>Motivo:</strong> {credenciado.motivo_suspensao}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prazos Próximos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Prazos Próximos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!prazos || prazos.length === 0 ? (
            <p className="text-muted-foreground">Nenhum prazo cadastrado</p>
          ) : (
            <div className="space-y-3">
              {prazos.map((prazo) => {
                const urgencia = getPrazoUrgencia(prazo.data_vencimento);
                return (
                  <div key={prazo.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{prazo.tipo_prazo}</p>
                      <p className="text-sm text-muted-foreground">
                        Vence em: {format(new Date(prazo.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge className={urgencia.color}>{urgencia.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline de Mudanças */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Mudanças
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!historico || historico.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma mudança registrada</p>
          ) : (
            <div className="space-y-4">
              {historico.map((item, index) => (
                <div key={item.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-primary' : 'bg-muted'}`} />
                    {index < historico.length - 1 && <div className="w-0.5 h-full bg-muted mt-1" />}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getStatusColor(item.status_novo)}>
                        {item.status_anterior} → {item.status_novo}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm">{item.motivo}</p>
                    {item.alterado_por_nome && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Por: {item.alterado_por_nome}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}