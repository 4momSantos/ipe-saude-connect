import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Stethoscope, AlertCircle, Edit2 } from "lucide-react";
import { useCredenciado } from "@/hooks/useCredenciados";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { HorariosEditor } from "./HorariosEditor";

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
  const { hasRole } = useUserRole();
  const [editingCrmId, setEditingCrmId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  // Verificar se o usuário logado é o dono do credenciado
  useEffect(() => {
    const checkOwnership = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && credenciado?.inscricoes_edital) {
        setIsOwner(credenciado.inscricoes_edital.candidato_id === user.id);
      }
    };
    
    if (credenciado) {
      checkOwnership();
    }
  }, [credenciado]);

  // Permissão para editar: credenciado (owner), analista, gestor ou admin
  const canEdit = isOwner || hasRole("analista") || hasRole("gestor") || hasRole("admin");

  // Realtime subscription para horários
  useEffect(() => {
    if (!credenciadoId) return;

    const channel = supabase
      .channel('horarios-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'horarios_atendimento'
        },
        () => {
          // Recarregar dados do credenciado quando houver mudança
          window.location.reload();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [credenciadoId]);

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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Ativo
                      </Badge>
                      {canEdit && editingCrmId !== crm.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingCrmId(crm.id)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Editar Horários
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Horários de Atendimento
                    </div>
                    
                    {editingCrmId === crm.id ? (
                      <HorariosEditor
                        credenciadoCrmId={crm.id}
                        horariosAtuais={crm.horarios || []}
                        onCancel={() => setEditingCrmId(null)}
                      />
                    ) : (
                      <>
                        {!crm.horarios || crm.horarios.length === 0 ? (
                          <div className="rounded-md bg-muted/30 p-4 text-center">
                            <p className="text-sm text-muted-foreground">
                              Nenhum horário de atendimento cadastrado para esta especialidade.
                            </p>
                            {canEdit && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-3"
                                onClick={() => setEditingCrmId(crm.id)}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Adicionar Horários
                              </Button>
                            )}
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
                      </>
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
