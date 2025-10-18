import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, FileCheck, Calendar, UserCheck, AlertCircle, Award, Shield, Clock } from "lucide-react";
import { useHistoricoCredenciado } from "@/hooks/useHistoricoCredenciado";
import { Skeleton } from "@/components/ui/skeleton";

interface HistoricoCredenciadoProps {
  credenciadoId: string;
}

const tipoIcons = {
  status_change: AlertCircle,
  credenciamento: UserCheck,
  afastamento: Clock,
  avaliacao: Award,
  certificado: Shield,
  prazo: Bell,
  historico: FileCheck,
};

const tipoColors = {
  status_change: "text-orange-500",
  credenciamento: "text-green-500",
  afastamento: "text-blue-500",
  avaliacao: "text-purple-500",
  certificado: "text-indigo-500",
  prazo: "text-yellow-500",
  historico: "text-slate-500",
};

const statusColors = {
  Ativo: "bg-green-500/10 text-green-700 border-green-500/20",
  Suspenso: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  "Suspenso Temporariamente": "bg-orange-500/10 text-orange-700 border-orange-500/20",
  Descredenciado: "bg-red-500/10 text-red-700 border-red-500/20",
  aprovado: "bg-green-500/10 text-green-700 border-green-500/20",
  pendente: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  rejeitado: "bg-red-500/10 text-red-700 border-red-500/20",
  rascunho: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  finalizada: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  ativo: "bg-green-500/10 text-green-700 border-green-500/20",
  vencido: "bg-red-500/10 text-red-700 border-red-500/20",
};

export function HistoricoCredenciado({ credenciadoId }: HistoricoCredenciadoProps) {
  const { data: eventos, isLoading } = useHistoricoCredenciado(credenciadoId);

  return (
    <div className="space-y-6">
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Histórico de Eventos
          </CardTitle>
          <CardDescription>
            Registro completo de status, suspensões, avaliações, certificados e prazos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 p-4">
                  <Skeleton className="h-5 w-5 shrink-0 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : eventos && eventos.length > 0 ? (
            <div className="space-y-4">
              {eventos.map((item) => {
                const Icon = tipoIcons[item.tipo as keyof typeof tipoIcons] || FileCheck;
                const iconColor = tipoColors[item.tipo as keyof typeof tipoColors] || "text-slate-500";

                return (
                  <div
                    key={item.id}
                    className="flex gap-4 rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-all hover-lift"
                  >
                    <div className={`mt-1 ${iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-semibold text-foreground">{item.titulo}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.descricao}
                          </p>
                        </div>
                        {item.status && (
                          <Badge
                            variant="outline"
                            className={`shrink-0 ${statusColors[item.status as keyof typeof statusColors] || ""}`}
                          >
                            {item.status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.data}
                        </span>
                        {item.responsavel && (
                          <>
                            <span>•</span>
                            <span>Responsável: {item.responsavel}</span>
                          </>
                        )}
                      </div>
                      
                      {/* Metadata adicional */}
                      {item.metadata && (
                        <div className="pt-2 border-t border-border/50">
                          {item.metadata.data_inicio && item.metadata.data_fim && (
                            <p className="text-xs text-muted-foreground">
                              Período: {new Date(item.metadata.data_inicio).toLocaleDateString("pt-BR")} até{" "}
                              {new Date(item.metadata.data_fim).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                          {item.metadata.pontuacao && (
                            <p className="text-xs text-muted-foreground">
                              Pontuação: {item.metadata.pontuacao}/100
                            </p>
                          )}
                          {item.metadata.data_vencimento && (
                            <p className="text-xs text-muted-foreground">
                              Vencimento: {new Date(item.metadata.data_vencimento).toLocaleDateString("pt-BR")}
                              {item.metadata.dias_restantes !== undefined && (
                                <span className={item.metadata.dias_restantes < 0 ? "text-red-500 ml-1" : "ml-1"}>
                                  ({item.metadata.dias_restantes < 0 ? "Vencido" : `${item.metadata.dias_restantes} dias`})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento registrado ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
