import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowStatusCard } from "@/components/workflow/WorkflowStatusCard";
import { DadosInscricaoTab } from "./DadosInscricaoTab";
import { DocumentosTabFromJSON } from "./DocumentosTabFromJSON";
import { MessagesTab } from "@/components/process-tabs/MessagesTab";
import { useInscricaoProgressoReal } from "@/hooks/useInscricaoProgressoReal";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  PenTool, 
  Award,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  Activity,
  FileStack,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType = 
  | "em_analise" 
  | "aprovado" 
  | "aguardando_assinatura" 
  | "assinado" 
  | "ativo"
  | "rejeitado";

interface FluxoCredenciamentoProps {
  status: StatusType;
  motivoRejeicao?: string;
  onAssinarContrato?: () => void;
  inscricaoId?: string;
  dadosInscricao?: any;
  candidatoNome?: string;
  workflowExecutionId?: string;
}

interface Etapa {
  id: StatusType;
  label: string;
  icon: typeof FileText;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

const etapas: Etapa[] = [
  {
    id: "em_analise",
    label: "Em Análise",
    icon: FileText,
    color: "text-[hsl(var(--blue-primary))]",
    bgColor: "bg-[hsl(var(--blue-primary)_/_0.15)]",
    borderColor: "border-[hsl(var(--blue-primary))]",
    description: "Documentos em análise pela equipe técnica"
  },
  {
    id: "aprovado",
    label: "Aprovado",
    icon: CheckCircle2,
    color: "text-[hsl(var(--green-approved))]",
    bgColor: "bg-[hsl(var(--green-approved)_/_0.15)]",
    borderColor: "border-[hsl(var(--green-approved))]",
    description: "Documentação aprovada"
  },
  {
    id: "aguardando_assinatura",
    label: "Aguardando Assinatura",
    icon: Clock,
    color: "text-[hsl(var(--orange-warning))]",
    bgColor: "bg-[hsl(var(--orange-warning)_/_0.15)]",
    borderColor: "border-[hsl(var(--orange-warning))]",
    description: "Aguardando assinatura do contrato"
  },
  {
    id: "assinado",
    label: "Assinado",
    icon: PenTool,
    color: "text-[hsl(var(--green-approved))]",
    bgColor: "bg-[hsl(var(--green-approved)_/_0.15)]",
    borderColor: "border-[hsl(var(--green-approved))]",
    description: "Contrato assinado com sucesso"
  },
  {
    id: "ativo",
    label: "Ativo",
    icon: Award,
    color: "text-[hsl(var(--green-approved))]",
    bgColor: "bg-[hsl(var(--green-approved)_/_0.15)]",
    borderColor: "border-[hsl(var(--green-approved))]",
    description: "Credenciamento ativo"
  }
];

export function FluxoCredenciamento({ 
  status, 
  motivoRejeicao,
  onAssinarContrato,
  inscricaoId,
  dadosInscricao,
  candidatoNome,
  workflowExecutionId
}: FluxoCredenciamentoProps) {
  console.log('[DEBUG FluxoCredenciamento Component] Renderizando com:', { 
    status, 
    inscricaoId, 
    hasOnAssinar: !!onAssinarContrato,
    hasDados: !!dadosInscricao 
  });

  const [isAssigning, setIsAssigning] = useState(false);
  
  // ✅ Buscar progresso real da inscrição
  const progressoReal = useInscricaoProgressoReal(inscricaoId || '');
  
  // ✅ Usar status real se disponível, caso contrário usar o status prop
  const statusAtual = progressoReal.etapaAtual || status;
  
  console.log('[DEBUG Progresso Real]:', {
    statusProp: status,
    statusReal: progressoReal.etapaAtual,
    statusUsado: statusAtual,
    temAprovacao: progressoReal.temAprovacao,
    temContrato: progressoReal.temContratoGerado,
    temAssinatura: progressoReal.temContratoAssinado,
    isActive: progressoReal.temCredenciamentoAtivo
  });
  
  // ✅ Validação adicional de segurança
  const shouldRenderWorkflowCard = inscricaoId && 
                                   typeof inscricaoId === 'string' && 
                                   inscricaoId.trim() !== '';

  const handleAssinar = async () => {
    setIsAssigning(true);
    try {
      await onAssinarContrato?.();
    } finally {
      setIsAssigning(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (statusAtual === "rejeitado") return -1;
    return etapas.findIndex(e => e.id === statusAtual);
  };

  const currentIndex = getCurrentStepIndex();
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / etapas.length) * 100 : 0;

  const getStepState = (index: number): "completed" | "current" | "pending" => {
    if (statusAtual === "rejeitado") return "pending";
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "pending";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Acompanhar Processo</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe o progresso do seu credenciamento e acesse todos os dados
            </p>
          </div>
          {status !== "rejeitado" && (
            <Badge
              variant="outline" 
              className={cn(
                "text-sm px-4 py-2",
                etapas[currentIndex]?.color,
                etapas[currentIndex]?.bgColor,
                etapas[currentIndex]?.borderColor
              )}
            >
              {etapas[currentIndex]?.label}
            </Badge>
          )}
        </div>

        {/* Progress Bar */}
          {statusAtual !== "rejeitado" && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-right">
              Etapa {currentIndex + 1} de {etapas.length}
            </p>
          </div>
        )}
      </div>

      {/* Sistema de Abas */}
      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="status" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Status
          </TabsTrigger>
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Dados da Inscrição
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileStack className="w-4 h-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="mensagens" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Mensagens
          </TabsTrigger>
        </TabsList>

        {/* Aba Status - Timeline e Workflow */}
        <TabsContent value="status" className="space-y-6 mt-6">
          {/* Alerta de Rejeição */}
          {statusAtual === "rejeitado" && (
            <Alert variant="destructive" className="animate-scale-in">
              <XCircle className="h-5 w-5" />
              <AlertTitle className="text-lg font-semibold">Processo Rejeitado</AlertTitle>
              <AlertDescription className="mt-2">
                {motivoRejeicao || "O processo de credenciamento foi rejeitado. Entre em contato com o suporte para mais informações."}
              </AlertDescription>
            </Alert>
          )}

          {/* Timeline Horizontal */}
          {statusAtual !== "rejeitado" && (
            <div className="relative py-4">
              {/* Linha conectora de fundo */}
              <div className="absolute top-[72px] left-8 right-8 h-1 bg-border rounded-full" style={{ zIndex: 0 }} />
              
              {/* Linha de progresso animada */}
              <div 
                className="absolute top-[72px] left-8 h-1 bg-gradient-to-r from-[hsl(var(--blue-primary))] via-[hsl(var(--orange-warning))] to-[hsl(var(--green-approved))] rounded-full transition-all duration-1000 ease-out shadow-lg"
                style={{ 
                  width: `calc(${progress}% - 64px)`,
                  zIndex: 1,
                  boxShadow: '0 0 10px hsl(var(--primary) / 0.5)'
                }}
              />

              {/* Cards das Etapas */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative" style={{ zIndex: 2 }}>
                {etapas.map((etapa, index) => {
                  const state = getStepState(index);
                  const Icon = etapa.icon;

                  return (
                    <div
                      key={etapa.id}
                      className={cn(
                        "transition-all duration-700 ease-out",
                        state === "current" && "animate-fade-in"
                      )}
                      style={{
                        animationDelay: `${index * 100}ms`
                      }}
                    >
                      <Card
                        className={cn(
                          "relative overflow-hidden transition-all duration-500 hover-lift border-2",
                          state === "current" && "ring-2 ring-offset-2 ring-primary shadow-2xl card-glow scale-105",
                          state === "completed" && "bg-muted/30",
                          state === "pending" && "opacity-60 grayscale hover:grayscale-0",
                          etapa.borderColor
                        )}
                      >
                        {/* Background gradient sutil */}
                        <div 
                          className={cn(
                            "absolute inset-0 opacity-5",
                            etapa.bgColor
                          )}
                        />

                        <CardHeader className="pb-3 relative">
                          {/* Ícone da etapa */}
                          <div 
                            className={cn(
                              "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-500 shadow-md",
                              etapa.bgColor,
                              "border-3",
                              etapa.borderColor,
                              state === "current" && "scale-110 shadow-2xl animate-pulse",
                              state === "completed" && "ring-2 ring-offset-2 ring-[hsl(var(--green-approved))]"
                            )}
                          >
                            <Icon className={cn("w-10 h-10 transition-transform duration-300", etapa.color)} />
                          </div>
                          
                          <CardTitle className="text-center text-sm font-bold">
                            {etapa.label}
                          </CardTitle>
                        </CardHeader>
                        
                        <CardContent className="relative">
                          <Separator className="mb-3" />
                          <CardDescription className="text-center text-xs leading-relaxed">
                            {etapa.description}
                          </CardDescription>
                          
                          {/* Indicador de status */}
                          <div className="mt-4 flex justify-center">
                            {state === "completed" && (
                              <div className="flex items-center gap-2 text-[hsl(var(--green-approved))] animate-scale-in">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="text-xs font-medium">Concluído</span>
                              </div>
                            )}
                            {state === "current" && (
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <div className="w-3 h-3 rounded-full bg-primary animate-ping absolute" />
                                  <div className="w-3 h-3 rounded-full bg-primary" />
                                </div>
                                <span className="text-xs font-medium text-primary">Em andamento</span>
                              </div>
                            )}
                            {state === "pending" && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span className="text-xs">Pendente</span>
                              </div>
                            )}
                          </div>
                        </CardContent>

                        {/* Efeito de brilho no topo do card atual */}
                        {state === "current" && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                        )}
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ação de Assinatura */}
          {statusAtual === "aguardando_assinatura" && (
            <Card className="border-2 border-[hsl(var(--orange-warning))] bg-gradient-to-br from-[hsl(var(--orange-warning)_/_0.08)] to-background animate-scale-in shadow-xl overflow-hidden relative">
              {/* Efeito de brilho animado */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[hsl(var(--orange-warning))] to-transparent animate-pulse" />
              
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[hsl(var(--orange-warning)_/_0.2)] flex items-center justify-center shadow-lg animate-pulse">
                    <AlertTriangle className="w-8 h-8 text-[hsl(var(--orange-warning))]" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-1">Ação Necessária</CardTitle>
                    <CardDescription className="text-base">
                      Seu credenciamento foi aprovado! Assine o contrato para ativar seu cadastro.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Separator />
                <div className="grid md:grid-cols-2 gap-3">
                  <Button 
                    size="lg"
                    onClick={handleAssinar}
                    disabled={isAssigning}
                    className="bg-[hsl(var(--green-approved))] hover:bg-[hsl(var(--green-approved)_/_0.9)] text-white font-bold shadow-xl hover-lift text-base h-14"
                  >
                    <PenTool className="w-5 h-5 mr-2" />
                    {isAssigning ? "Processando assinatura..." : "Assinar Contrato Agora"}
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-2 hover:border-primary h-14"
                  >
                    <Eye className="w-5 h-5 mr-2" />
                    Visualizar Contrato
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Ao assinar, você concorda com os termos e condições do credenciamento IPE Saúde
                </p>
              </CardContent>
            </Card>
          )}

          {/* Selo de Credenciamento Ativo */}
          {statusAtual === "ativo" && (
            <Card className="border-2 border-[hsl(var(--green-approved))] bg-gradient-to-br from-[hsl(var(--green-approved)_/_0.1)] to-background animate-scale-in shadow-2xl overflow-hidden relative">
              {/* Confetti effect */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--green-approved)_/_0.1),transparent_70%)] animate-pulse" />
              
              {/* Borda superior brilhante */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[hsl(var(--green-approved))] via-[hsl(var(--green-approved)_/_0.7)] to-[hsl(var(--green-approved))]" />
              
              <CardHeader className="relative">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-[hsl(var(--green-approved)_/_0.2)] flex items-center justify-center shadow-2xl">
                      <Award className="w-12 h-12 text-[hsl(var(--green-approved))]" />
                    </div>
                    {/* Anel de brilho */}
                    <div className="absolute inset-0 rounded-full border-4 border-[hsl(var(--green-approved)_/_0.3)] animate-ping" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-[hsl(var(--green-approved))] to-[hsl(var(--green-approved)_/_0.7)] bg-clip-text text-transparent mb-2">
                      Parabéns! Você está credenciado
                    </CardTitle>
                    <CardDescription className="text-base">
                      Seu credenciamento está ativo e você já pode atuar no sistema IPE Saúde.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 relative">
                <Separator />
                <div className="grid md:grid-cols-2 gap-3">
                  <Button 
                    size="lg"
                    className="bg-[hsl(var(--green-approved))] hover:bg-[hsl(var(--green-approved)_/_0.9)] text-white font-bold shadow-lg hover-lift h-14 text-base"
                  >
                    Acessar Painel de Credenciado
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-2 border-[hsl(var(--green-approved))] hover:bg-[hsl(var(--green-approved)_/_0.1)] h-14"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Baixar Certificado
                  </Button>
                </div>
                
                {/* Info adicional */}
                <div className="bg-muted/50 rounded-lg p-4 mt-4">
                  <p className="text-sm text-center text-muted-foreground">
                    Certificado válido a partir de {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Workflow Status Card */}
          {shouldRenderWorkflowCard && (
            <WorkflowStatusCard inscricaoId={inscricaoId!} />
          )}
        </TabsContent>

        {/* Aba Dados da Inscrição */}
        <TabsContent value="dados" className="mt-6">
          <DadosInscricaoTab dadosInscricao={dadosInscricao} />
        </TabsContent>

        {/* Aba Documentos */}
        <TabsContent value="documentos" className="mt-6">
          {inscricaoId ? (
            <DocumentosTabFromJSON dadosInscricao={dadosInscricao} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileStack className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma inscrição vinculada.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Aba Mensagens */}
        <TabsContent value="mensagens" className="mt-6">
          {inscricaoId ? (
            <MessagesTab 
              processoId={inscricaoId}
              candidatoNome={candidatoNome || 'Prestador'}
              inscricaoId={inscricaoId}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma inscrição vinculada.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
