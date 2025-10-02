import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { FileEdit, Calendar, User, CheckCircle2, XCircle } from "lucide-react";

interface SolicitacoesAlteracaoProps {
  credenciadoId: string;
}

const mockSolicitacoes = [
  {
    id: "1",
    tipo: "Alteração de Endereço",
    descricao: "Mudança de endereço comercial",
    dataSolicitacao: "20/03/2024",
    status: "pendente" as const,
    solicitante: "Dr. João Silva",
    dadosAtuais: "Rua Principal, 123",
    dadosNovos: "Av. Central, 456",
  },
  {
    id: "2",
    tipo: "Atualização de Especialidade",
    descricao: "Inclusão de nova especialidade",
    dataSolicitacao: "18/03/2024",
    status: "aprovado" as const,
    solicitante: "Dr. João Silva",
    dadosAtuais: "Cardiologia",
    dadosNovos: "Cardiologia, Clínica Médica",
  },
  {
    id: "3",
    tipo: "Alteração de Horários",
    descricao: "Ajuste de horários de atendimento",
    dataSolicitacao: "15/03/2024",
    status: "em_analise" as const,
    solicitante: "Dr. João Silva",
    dadosAtuais: "Seg-Sex 08:00-17:00",
    dadosNovos: "Seg-Qui 08:00-18:00",
  },
];

export function SolicitacoesAlteracao({ credenciadoId }: SolicitacoesAlteracaoProps) {
  return (
    <div className="space-y-6">
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-primary" />
            Solicitações de Alteração
          </CardTitle>
          <CardDescription>
            Pedidos de atualização de dados com fluxo de aprovação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockSolicitacoes.map((solicitacao) => (
              <div
                key={solicitacao.id}
                className="rounded-lg border border-border bg-card p-6 space-y-4 hover:border-primary/50 transition-all hover-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-foreground text-lg">
                      {solicitacao.tipo}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {solicitacao.descricao}
                    </p>
                  </div>
                  <StatusBadge status={solicitacao.status} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 rounded-md bg-muted/30 p-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase">
                      Dados Atuais
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {solicitacao.dadosAtuais}
                    </p>
                  </div>
                  <div className="space-y-2 rounded-md bg-primary/5 p-3 border border-primary/20">
                    <p className="text-xs font-medium text-primary uppercase">
                      Dados Solicitados
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {solicitacao.dadosNovos}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {solicitacao.dataSolicitacao}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {solicitacao.solicitante}
                  </span>
                </div>

                {solicitacao.status === "pendente" && (
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button size="sm" className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2">
                      <XCircle className="h-4 w-4" />
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
