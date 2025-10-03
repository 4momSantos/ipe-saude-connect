import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  PenTool, 
  Award,
  XCircle,
  AlertTriangle
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
    bgColor: "bg-[hsl(var(--blue-primary)_/_0.1)]",
    borderColor: "border-[hsl(var(--blue-primary)_/_0.3)]",
    description: "Documentos em análise pela equipe técnica"
  },
  {
    id: "aprovado",
    label: "Aprovado",
    icon: CheckCircle2,
    color: "text-[hsl(var(--green-approved))]",
    bgColor: "bg-[hsl(var(--green-approved)_/_0.1)]",
    borderColor: "border-[hsl(var(--green-approved)_/_0.3)]",
    description: "Documentação aprovada"
  },
  {
    id: "aguardando_assinatura",
    label: "Aguardando Assinatura",
    icon: Clock,
    color: "text-[hsl(var(--orange-warning))]",
    bgColor: "bg-[hsl(var(--orange-warning)_/_0.1)]",
    borderColor: "border-[hsl(var(--orange-warning)_/_0.3)]",
    description: "Aguardando assinatura do contrato"
  },
  {
    id: "assinado",
    label: "Assinado",
    icon: PenTool,
    color: "text-[hsl(var(--green-approved))]",
    bgColor: "bg-[hsl(var(--green-approved)_/_0.1)]",
    borderColor: "border-[hsl(var(--green-approved)_/_0.3)]",
    description: "Contrato assinado com sucesso"
  },
  {
    id: "ativo",
    label: "Ativo",
    icon: Award,
    color: "text-[hsl(var(--green-approved))]",
    bgColor: "bg-[hsl(var(--green-approved)_/_0.1)]",
    borderColor: "border-[hsl(var(--green-approved)_/_0.3)]",
    description: "Credenciamento ativo"
  }
];

export function FluxoCredenciamento({ 
  status, 
  motivoRejeicao,
  onAssinarContrato 
}: FluxoCredenciamentoProps) {
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssinar = async () => {
    setIsAssigning(true);
    try {
      await onAssinarContrato?.();
    } finally {
      setIsAssigning(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (status === "rejeitado") return -1;
    return etapas.findIndex(e => e.id === status);
  };

  const currentIndex = getCurrentStepIndex();
  const progress = currentIndex >= 0 ? ((currentIndex + 1) / etapas.length) * 100 : 0;

  const getStepState = (index: number): "completed" | "current" | "pending" => {
    if (status === "rejeitado") return "pending";
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "current";
    return "pending";
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fluxo de Credenciamento</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe o progresso do seu processo de credenciamento
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
        {status !== "rejeitado" && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-right">
              Etapa {currentIndex + 1} de {etapas.length}
            </p>
          </div>
        )}
      </div>

      {/* Alerta de Rejeição */}
      {status === "rejeitado" && (
        <Alert variant="destructive" className="animate-scale-in">
          <XCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-semibold">Processo Rejeitado</AlertTitle>
          <AlertDescription className="mt-2">
            {motivoRejeicao || "O processo de credenciamento foi rejeitado. Entre em contato com o suporte para mais informações."}
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline Horizontal */}
      {status !== "rejeitado" && (
        <div className="relative">
          {/* Linha conectora */}
          <div className="absolute top-16 left-0 right-0 h-1 bg-border" style={{ zIndex: 0 }} />
          <div 
            className="absolute top-16 left-0 h-1 bg-gradient-to-r from-[hsl(var(--blue-primary))] to-[hsl(var(--green-approved))] transition-all duration-700"
            style={{ 
              width: `${progress}%`,
              zIndex: 1
            }}
          />

          {/* Cards das Etapas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative" style={{ zIndex: 2 }}>
            {etapas.map((etapa, index) => {
              const state = getStepState(index);
              const Icon = etapa.icon;

              return (
                <Card
                  key={etapa.id}
                  className={cn(
                    "relative transition-all duration-500 hover-lift",
                    state === "current" && "ring-2 ring-primary shadow-lg card-glow",
                    state === "completed" && "opacity-80",
                    state === "pending" && "opacity-50",
                    state === "current" && "animate-scale-in"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div 
                      className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300",
                        etapa.bgColor,
                        "border-2",
                        etapa.borderColor,
                        state === "current" && "scale-110 shadow-lg"
                      )}
                    >
                      <Icon className={cn("w-8 h-8", etapa.color)} />
                    </div>
                    <CardTitle className="text-center text-base">
                      {etapa.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-xs">
                      {etapa.description}
                    </CardDescription>
                    
                    {/* Indicador de status */}
                    <div className="mt-4 flex justify-center">
                      {state === "completed" && (
                        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--green-approved))] animate-scale-in" />
                      )}
                      {state === "current" && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                      {state === "pending" && (
                        <div className="w-2 h-2 rounded-full bg-border" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Ação de Assinatura */}
      {status === "aguardando_assinatura" && (
        <Card className="border-[hsl(var(--orange-warning)_/_0.5)] bg-[hsl(var(--orange-warning)_/_0.05)] animate-scale-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[hsl(var(--orange-warning)_/_0.2)] flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[hsl(var(--orange-warning))]" />
              </div>
              <div>
                <CardTitle>Ação Necessária</CardTitle>
                <CardDescription>
                  Seu credenciamento foi aprovado! Assine o contrato para ativar seu cadastro.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button 
                size="lg"
                onClick={handleAssinar}
                disabled={isAssigning}
                className="flex-1 bg-[hsl(var(--green-approved))] hover:bg-[hsl(var(--green-approved)_/_0.9)] text-white font-semibold shadow-lg hover-lift"
              >
                <PenTool className="w-5 h-5 mr-2" />
                {isAssigning ? "Processando..." : "Assinar Contrato"}
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="flex-1"
              >
                <FileText className="w-5 h-5 mr-2" />
                Visualizar Contrato
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selo de Credenciamento Ativo */}
      {status === "ativo" && (
        <Card className="border-[hsl(var(--green-approved)_/_0.5)] bg-[hsl(var(--green-approved)_/_0.05)] animate-scale-in">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--green-approved)_/_0.2)] flex items-center justify-center">
                <Award className="w-10 h-10 text-[hsl(var(--green-approved))]" />
              </div>
              <div>
                <CardTitle className="text-2xl">Parabéns! Você está credenciado</CardTitle>
                <CardDescription className="text-base mt-1">
                  Seu credenciamento está ativo e você já pode atuar no sistema IPE Saúde.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button 
                size="lg"
                className="flex-1"
              >
                Acessar Painel de Credenciado
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="flex-1"
              >
                Baixar Certificado
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
