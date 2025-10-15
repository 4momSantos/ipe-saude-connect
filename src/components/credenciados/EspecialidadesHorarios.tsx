import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Stethoscope, AlertCircle } from "lucide-react";
import { useCredenciado } from "@/hooks/useCredenciados";

interface EspecialidadesHorariosProps {
  credenciadoId: string;
}

const diasSemanaMap: Record<number, string> = {
  0: "Domingo",
  1: "Segunda-feira",
  2: "Terça-feira",
  3: "Quarta-feira",
  4: "Quinta-feira",
  5: "Sexta-feira",
  6: "Sábado",
};

export function EspecialidadesHorarios({ credenciadoId }: EspecialidadesHorariosProps) {
  const { data: credenciado, isLoading } = useCredenciado(credenciadoId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="card-glow">
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-6 space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 mt-4">
                    {[1, 2, 3].map((j) => (
                      <Skeleton key={j} className="h-16" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const especialidades = credenciado?.crms || [];

  return (
    <div className="space-y-6">
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Especialidades e Horários de Atendimento
          </CardTitle>
          <CardDescription>
            Configuração de especialidades vinculadas e agenda de atendimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {especialidades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma especialidade vinculada
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Este credenciado ainda não possui especialidades médicas vinculadas ao seu cadastro.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {especialidades.map((crm) => (
                <div
                  key={crm.id}
                  className="rounded-lg border border-border bg-card p-6 space-y-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-foreground">
                        {crm.especialidade || "Especialidade não especificada"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        CRM: {crm.crm}-{crm.uf_crm}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                      Ativo
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Horários de Atendimento
                    </div>
                    {!crm.horarios || crm.horarios.length === 0 ? (
                      <div className="rounded-md bg-muted/30 p-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          Nenhum horário de atendimento cadastrado para esta especialidade.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {crm.horarios.map((horario, index) => (
                          <div
                            key={index}
                            className="rounded-md bg-muted/50 p-3 space-y-1"
                          >
                            <p className="text-sm font-medium text-foreground">
                              {diasSemanaMap[horario.dia_semana] || horario.dia_semana}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {horario.horario_inicio} - {horario.horario_fim}
                            </p>
                          </div>
                        ))}
                      </div>
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
