import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FluxoProgramaticoMonitor } from "./FluxoProgramaticoMonitor";

interface StepStatus {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  timestamp?: string;
  description?: string;
}

interface FluxoCredenciamentoMonitorProps {
  inscricaoId: string;
}

export function FluxoCredenciamentoMonitor({ inscricaoId }: FluxoCredenciamentoMonitorProps) {
  // Verificar se usa fluxo programático
  const { data: inscricao, isLoading: loadingInscricao } = useQuery({
    queryKey: ["inscricao-tipo", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_edital")
        .select("id, workflow_execution_id, editais(use_programmatic_flow)")
        .eq("id", inscricaoId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Se usa fluxo programático, renderizar componente específico
  if (inscricao?.editais?.use_programmatic_flow === true) {
    return <FluxoProgramaticoMonitor inscricaoId={inscricaoId} />;
  }

  // Se não tem workflow_execution_id, mostrar aguardando
  if (inscricao && !inscricao.workflow_execution_id) {
    return (
      <Card>
        <CardContent className="p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
          <div>
            <p className="font-medium">Aguardando processamento</p>
            <p className="text-sm text-muted-foreground mt-1">
              Sua inscrição está na fila e será processada em breve.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const [steps, setSteps] = useState<StepStatus[]>([
    { name: 'Inscrição Enviada', status: 'pending' },
    { name: 'Análise Pendente', status: 'pending' },
    { name: 'Análise Concluída', status: 'pending' },
    { name: 'Contrato Gerado', status: 'pending' },
    { name: 'Assinatura Recebida', status: 'pending' },
    { name: 'Credenciado Ativado', status: 'pending' },
    { name: 'Certificado Emitido', status: 'pending' },
  ]);

  const { data, refetch } = useQuery({
    queryKey: ['fluxo-credenciamento', inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricoes_edital')
        .select(`
          id,
          status,
          is_rascunho,
          created_at,
          analisado_em,
          analises (
            id,
            status,
            analisado_em
          ),
          contratos (
            id,
            status,
            created_at,
            assinado_em
          ),
          credenciados (
            id,
            status,
            created_at,
            certificados (
              id,
              status,
              created_at
            )
          )
        `)
        .eq('id', inscricaoId)
        .single();

      if (error) throw error;
      return data;
    },
    refetchInterval: 3000, // Poll a cada 3 segundos
  });

  useEffect(() => {
    if (!data) return;

    const newSteps: StepStatus[] = [
      {
        name: 'Inscrição Enviada',
        status: !data.is_rascunho && data.status !== 'rascunho' ? 'completed' : 'pending',
        timestamp: data.created_at,
        description: !data.is_rascunho ? 'Inscrição submetida com sucesso' : 'Aguardando envio'
      },
      {
        name: 'Análise Pendente',
        status: data.status === 'aguardando_analise' 
          ? 'running' 
          : (data.analises && (data.analises as any).length > 0) ? 'completed' : 'pending',
        description: data.status === 'aguardando_analise' ? 'Aguardando analista' : undefined
      },
      {
        name: 'Análise Concluída',
        status: 
          data.status === 'aprovado' ? 'completed' :
          data.status === 'inabilitado' || data.status === 'rejeitado' ? 'failed' :
          (data.analises && (data.analises as any).length > 0) ? 'running' : 'pending',
        timestamp: data.analisado_em || undefined,
        description: data.status === 'aprovado' ? 'Inscrição aprovada' : 
                     data.status === 'inabilitado' ? 'Inscrição reprovada' : undefined
      },
      {
        name: 'Contrato Gerado',
        status: (data.contratos && (data.contratos as any).length > 0) ? 'completed' : 'pending',
        timestamp: (data.contratos as any)?.[0]?.created_at,
        description: (data.contratos as any)?.[0] ? 'Contrato disponível para assinatura' : undefined
      },
      {
        name: 'Assinatura Recebida',
        status: (data.contratos as any)?.[0]?.status === 'assinado' ? 'completed' : 
                (data.contratos as any)?.[0]?.status === 'pendente_assinatura' ? 'running' : 'pending',
        timestamp: (data.contratos as any)?.[0]?.assinado_em,
        description: (data.contratos as any)?.[0]?.status === 'assinado' ? 'Contrato assinado digitalmente' : 
                     (data.contratos as any)?.[0]?.status === 'pendente_assinatura' ? 'Aguardando assinatura' : undefined
      },
      {
        name: 'Credenciado Ativado',
        status: (data.credenciados && (data.credenciados as any).length > 0) && 
                (data.credenciados as any)[0].status === 'Ativo' ? 'completed' : 'pending',
        timestamp: (data.credenciados as any)?.[0]?.created_at,
        description: (data.credenciados as any)?.[0]?.status === 'Ativo' ? 'Credenciamento ativo' : undefined
      },
      {
        name: 'Certificado Emitido',
        status: (data.credenciados as any)?.[0]?.certificados?.length > 0 ? 'completed' : 'pending',
        timestamp: (data.credenciados as any)?.[0]?.certificados?.[0]?.created_at,
        description: (data.credenciados as any)?.[0]?.certificados?.length > 0 ? 'Certificado disponível' : undefined
      },
    ];

    setSteps(newSteps);
  }, [data]);

  const getStatusIcon = (status: StepStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: StepStatus['status']) => {
    const variants = {
      completed: 'default' as const,
      running: 'secondary' as const,
      failed: 'destructive' as const,
      pending: 'outline' as const,
    };

    const labels = {
      completed: 'Concluído',
      running: 'Em andamento',
      failed: 'Falhou',
      pending: 'Pendente',
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Credenciamento</CardTitle>
        <CardDescription>
          Acompanhe o progresso da inscrição em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <p className="font-medium">{step.name}</p>
                {getStatusBadge(step.status)}
              </div>
              {step.description && (
                <p className="text-sm text-muted-foreground">{step.description}</p>
              )}
              {step.timestamp && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(step.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
