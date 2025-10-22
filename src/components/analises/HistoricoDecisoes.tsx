import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useHistoricoDecisoes } from "@/hooks/useHistoricoDecisoes";

interface HistoricoDecisoesProps {
  inscricaoId: string;
}

export function HistoricoDecisoes({ inscricaoId }: HistoricoDecisoesProps) {
  const { data: decisoes, isLoading } = useHistoricoDecisoes(inscricaoId);

  if (isLoading || !decisoes || decisoes.length === 0) return null;

  const statusConfig = {
    aprovado: { icon: CheckCircle2, label: 'Aprovado', color: 'text-green-600' },
    reprovado: { icon: XCircle, label: 'Reprovado', color: 'text-red-600' },
    pendente_correcao: { icon: AlertTriangle, label: 'Pendente', color: 'text-yellow-600' }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Histórico ({decisoes.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {decisoes.map((decisao) => {
          const config = statusConfig[decisao.decisao.status];
          const Icon = config.icon;
          return (
            <div key={decisao.id} className="p-3 border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className="font-semibold text-sm">{config.label}</span>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(decisao.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <User className="h-3 w-3" />
                <span>{decisao.analista_nome}</span>
              </div>
              <p className="text-sm text-muted-foreground">{decisao.decisao.justificativa}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
