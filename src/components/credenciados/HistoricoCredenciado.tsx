import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, FileCheck, Calendar } from "lucide-react";

interface HistoricoCredenciadoProps {
  credenciadoId: string;
}

const mockHistorico = [
  {
    id: "1",
    tipo: "auditoria",
    titulo: "Auditoria de Qualidade",
    descricao: "Auditoria de conformidade realizada com sucesso",
    data: "15/03/2024",
    status: "aprovado" as const,
    responsavel: "Maria Santos",
  },
  {
    id: "2",
    tipo: "notificacao",
    titulo: "Atualização de Documentação",
    descricao: "Solicitação de atualização de certidões",
    data: "10/03/2024",
    status: "pendente" as const,
    responsavel: "Sistema",
  },
  {
    id: "3",
    tipo: "sancao",
    titulo: "Advertência - Atraso em Relatório",
    descricao: "Atraso na entrega de relatório mensal",
    data: "01/03/2024",
    status: "em_analise" as const,
    responsavel: "João Silva",
  },
];

const tipoIcons = {
  auditoria: FileCheck,
  notificacao: Bell,
  sancao: AlertTriangle,
};

const tipoColors = {
  auditoria: "text-blue-500",
  notificacao: "text-orange-500",
  sancao: "text-red-500",
};

export function HistoricoCredenciado({ credenciadoId }: HistoricoCredenciadoProps) {
  return (
    <div className="space-y-6">
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Histórico de Eventos
          </CardTitle>
          <CardDescription>
            Registro de sanções, notificações e auditorias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockHistorico.map((item) => {
              const Icon = tipoIcons[item.tipo as keyof typeof tipoIcons];
              const iconColor = tipoColors[item.tipo as keyof typeof tipoColors];

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
                      <Badge
                        variant="outline"
                        className="shrink-0"
                      >
                        {item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {item.data}
                      </span>
                      <span>•</span>
                      <span>Responsável: {item.responsavel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
