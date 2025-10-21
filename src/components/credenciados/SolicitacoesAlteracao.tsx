import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { FileEdit, Calendar, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useSolicitacoesAlteracao, useAprovarSolicitacao, useRejeitarSolicitacao } from "@/hooks/useSolicitacoesAlteracao";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SolicitarAlteracaoDialog } from "./SolicitarAlteracaoDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface SolicitacoesAlteracaoProps {
  credenciadoId: string;
  dadosAtuais?: {
    endereco?: string;
    telefone?: string;
    email?: string;
    especialidades?: string;
  };
}

const formatarDados = (dados: any): string => {
  if (typeof dados === "string") return dados;
  if (typeof dados === "object" && dados !== null) {
    return JSON.stringify(dados, null, 2);
  }
  return String(dados);
};

const mapearStatus = (status: string): "pendente" | "aprovado" | "rejeitado" => {
  const statusLower = status.toLowerCase();
  if (statusLower === "aprovado" || statusLower === "aprovada") return "aprovado";
  if (statusLower === "rejeitado" || statusLower === "rejeitada") return "rejeitado";
  return "pendente";
};

export function SolicitacoesAlteracao({ credenciadoId, dadosAtuais }: SolicitacoesAlteracaoProps) {
  const { data: solicitacoes, isLoading } = useSolicitacoesAlteracao(credenciadoId);
  const { isCandidato } = useUserRole();
  const aprovarMutation = useAprovarSolicitacao();
  const rejeitarMutation = useRejeitarSolicitacao();

  const handleAprovar = (id: string) => {
    aprovarMutation.mutate({ id });
  };

  const handleRejeitar = (id: string) => {
    rejeitarMutation.mutate({ id });
  };

  return (
    <div className="space-y-6">
      <Card className="card-glow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5 text-primary" />
                Solicitações de Alteração
              </CardTitle>
              <CardDescription>
                Pedidos de atualização de dados com fluxo de aprovação
              </CardDescription>
            </div>
            {isCandidato && dadosAtuais && (
              <SolicitarAlteracaoDialog 
                credenciadoId={credenciadoId}
                dadosAtuais={dadosAtuais}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !solicitacoes || solicitacoes.length === 0 ? (
            <Alert>
              <AlertDescription>
                Não há solicitações de alteração para este credenciado.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {solicitacoes.map((solicitacao) => (
                <div
                  key={solicitacao.id}
                  className="rounded-lg border border-border bg-card p-6 space-y-4 hover:border-primary/50 transition-all hover-lift"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-foreground text-lg">
                        {solicitacao.tipo_alteracao}
                      </h4>
                      {solicitacao.justificativa && (
                        <p className="text-sm text-muted-foreground">
                          {solicitacao.justificativa}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={mapearStatus(solicitacao.status)} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 rounded-md bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Dados Atuais
                      </p>
                      <pre className="text-sm font-medium text-foreground whitespace-pre-wrap">
                        {formatarDados(solicitacao.dados_atuais)}
                      </pre>
                    </div>
                    <div className="space-y-2 rounded-md bg-primary/5 p-3 border border-primary/20">
                      <p className="text-xs font-medium text-primary uppercase">
                        Dados Solicitados
                      </p>
                      <pre className="text-sm font-medium text-foreground whitespace-pre-wrap">
                        {formatarDados(solicitacao.dados_propostos)}
                      </pre>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(solicitacao.solicitado_em).toLocaleDateString("pt-BR")}
                    </span>
                    {solicitacao.analisado_em && (
                      <>
                        <span>•</span>
                        <span>
                          Analisado em {new Date(solicitacao.analisado_em).toLocaleDateString("pt-BR")}
                        </span>
                      </>
                    )}
                  </div>

                  {solicitacao.observacoes_analise && (
                    <div className="rounded-md bg-muted/30 p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                        Observações da Análise
                      </p>
                      <p className="text-sm text-foreground">{solicitacao.observacoes_analise}</p>
                    </div>
                  )}

                  {solicitacao.status === "Pendente" && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <Button 
                        size="sm" 
                        className="gap-2"
                        onClick={() => handleAprovar(solicitacao.id)}
                        disabled={aprovarMutation.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-2"
                        onClick={() => handleRejeitar(solicitacao.id)}
                        disabled={rejeitarMutation.isPending}
                      >
                        <XCircle className="h-4 w-4" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
