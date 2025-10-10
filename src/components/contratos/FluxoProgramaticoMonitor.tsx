import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Circle, Clock, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FluxoProgramaticoMonitorProps {
  inscricaoId: string;
}

interface StepStatus {
  name: string;
  status: "completed" | "running" | "pending" | "failed";
  timestamp?: string;
  description?: string;
}

export function FluxoProgramaticoMonitor({ inscricaoId }: FluxoProgramaticoMonitorProps) {
  const { data: inscricao, isLoading: loadingInscricao, error: inscricaoError } = useQuery({
    queryKey: ["inscricao-programatica", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inscricoes_edital")
        .select("*, editais(use_programmatic_flow)")
        .eq("id", inscricaoId)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao buscar inscrição:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Inscrição não encontrada');
      }
      
      return data;
    },
    retry: 1,
  });

  const { data: analise } = useQuery({
    queryKey: ["analise-programatica", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analises")
        .select("*")
        .eq("inscricao_id", inscricaoId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!inscricaoId,
  });

  const { data: contrato } = useQuery({
    queryKey: ["contrato-programatico", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("*")
        .eq("inscricao_id", inscricaoId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!inscricaoId,
  });

  const { data: credenciado } = useQuery({
    queryKey: ["credenciado-programatico", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credenciados")
        .select("*")
        .eq("inscricao_id", inscricaoId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!inscricaoId,
  });

  const { data: certificado } = useQuery({
    queryKey: ["certificado-programatico", inscricaoId],
    queryFn: async () => {
      if (!credenciado?.id) return null;
      
      const { data, error } = await supabase
        .from("certificados")
        .select("*")
        .eq("credenciado_id", credenciado.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!credenciado?.id,
  });

  if (loadingInscricao) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (inscricaoError) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao carregar dados</AlertTitle>
            <AlertDescription>
              Não foi possível carregar as informações da inscrição. Por favor, tente novamente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!inscricao) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Inscrição não encontrada.</p>
        </CardContent>
      </Card>
    );
  }

  // Construir steps baseado no fluxo programático
  const steps: StepStatus[] = [
    {
      name: "Inscrição Enviada",
      status: inscricao.created_at ? "completed" : "pending",
      timestamp: inscricao.created_at,
      description: "Inscrição submetida com sucesso",
    },
    {
      name: "Aguardando Análise",
      status: inscricao.status === "aguardando_analise" 
        ? "running" 
        : inscricao.status === "em_analise" || analise 
        ? "completed" 
        : "pending",
      timestamp: inscricao.status === "aguardando_analise" ? inscricao.updated_at : undefined,
      description: "Inscrição na fila de análise",
    },
    {
      name: "Análise Documental",
      status: !analise 
        ? "pending"
        : analise.status === "pendente"
        ? "running"
        : analise.status === "aprovado"
        ? "completed"
        : "failed",
      timestamp: analise?.analisado_em || (analise?.status === "pendente" ? analise.created_at : undefined),
      description: analise?.status === "aprovado" 
        ? "Documentação aprovada" 
        : analise?.status === "reprovado"
        ? `Reprovado: ${analise.motivo_reprovacao}`
        : "Em análise pela equipe",
    },
    {
      name: "Geração de Contrato",
      status: !contrato
        ? "pending"
        : contrato.status === "pendente_assinatura"
        ? "completed"
        : "running",
      timestamp: contrato?.gerado_em,
      description: contrato ? `Contrato ${contrato.numero_contrato} gerado` : "Aguardando aprovação",
    },
    {
      name: "Assinatura de Contrato",
      status: !contrato
        ? "pending"
        : contrato.status === "assinado"
        ? "completed"
        : contrato.status === "pendente_assinatura"
        ? "running"
        : "pending",
      timestamp: contrato?.assinado_em,
      description: contrato?.status === "assinado" 
        ? "Contrato assinado por todas as partes"
        : contrato?.status === "pendente_assinatura"
        ? "Aguardando assinatura"
        : "Aguardando geração do contrato",
    },
    {
      name: "Credenciamento Ativo",
      status: !credenciado
        ? "pending"
        : credenciado.status === "Ativo"
        ? "completed"
        : "running",
      timestamp: credenciado?.status === "Ativo" ? credenciado.updated_at : undefined,
      description: credenciado?.status === "Ativo"
        ? "Credenciado ativo no sistema"
        : "Aguardando ativação",
    },
    {
      name: "Certificado Emitido",
      status: !certificado
        ? "pending"
        : certificado.status === "ativo"
        ? "completed"
        : "running",
      timestamp: certificado?.emitido_em,
      description: certificado?.status === "ativo"
        ? `Certificado ${certificado.numero_certificado} emitido`
        : "Aguardando emissão",
    },
  ];

  const getStatusIcon = (status: StepStatus["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-5 h-5 text-success" />;
      case "running":
        return <Clock className="w-5 h-5 text-warning animate-pulse" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "pending":
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: StepStatus["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-success">Concluído</Badge>;
      case "running":
        return <Badge variant="default" className="bg-warning">Em Andamento</Badge>;
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      case "pending":
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acompanhamento do Credenciamento</CardTitle>
        <CardDescription>Fluxo programático simplificado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4 pb-4 last:pb-0 border-b last:border-b-0">
              <div className="mt-1">{getStatusIcon(step.status)}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{step.name}</h4>
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
        </div>

        {inscricao.status === "inabilitado" && (
          <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Inscrição não aprovada</p>
              {inscricao.motivo_rejeicao && (
                <p className="text-sm text-muted-foreground mt-1">{inscricao.motivo_rejeicao}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
