import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DecisaoRegistrada } from "@/types/decisao";

interface HistoricoDecisoesProps {
  decisoes: DecisaoRegistrada[];
  isLoading?: boolean;
}

export function HistoricoDecisoes({ decisoes, isLoading }: HistoricoDecisoesProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Clock className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-sm text-muted-foreground">Carregando histórico...</span>
      </div>
    );
  }

  if (decisoes.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhuma decisão registrada ainda</p>
      </div>
    );
  }

  const statusConfig = {
    aprovado: {
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      label: "Aprovado"
    },
    reprovado: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      label: "Reprovado"
    },
    pendente_correcao: {
      icon: AlertCircle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      label: "Correção Solicitada"
    }
  };

  return (
    <div className="space-y-4">
      {decisoes.map((decisao, idx) => {
        const config = statusConfig[decisao.decisao.status];
        const Icon = config.icon;
        
        return (
          <div key={decisao.id} className="relative">
            {/* Timeline connector */}
            {idx < decisoes.length - 1 && (
              <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
            )}
            
            <div className={`p-4 rounded-lg border ${config.border} ${config.bg}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${config.bg}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`font-semibold ${config.color}`}>{config.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(decisao.created_at), "PPp", { locale: ptBR })}
                    </div>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    Por: <span className="font-medium">{decisao.analista_nome}</span>
                  </div>
                  
                  <div className="bg-white/50 p-3 rounded border border-border">
                    <p className="text-sm whitespace-pre-wrap">{decisao.decisao.justificativa}</p>
                  </div>
                  
                  {decisao.decisao.campos_reprovados && decisao.decisao.campos_reprovados.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-orange-700 mb-1">
                        Campos com problemas: {decisao.decisao.campos_reprovados.length}
                      </div>
                      <div className="space-y-1">
                        {decisao.decisao.campos_reprovados.slice(0, 3).map((campo, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            • {campo.secao} → {campo.campo}
                          </div>
                        ))}
                        {decisao.decisao.campos_reprovados.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            e mais {decisao.decisao.campos_reprovados.length - 3} campo(s)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {decisao.decisao.documentos_reprovados && decisao.decisao.documentos_reprovados.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-orange-700 mb-1">
                        Documentos com problemas: {decisao.decisao.documentos_reprovados.length}
                      </div>
                      <div className="space-y-1">
                        {decisao.decisao.documentos_reprovados.map((doc, idx) => (
                          <div key={idx} className="text-xs text-muted-foreground">
                            • {doc.tipo_documento}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {decisao.decisao.prazo_correcao && (
                    <div className="mt-3 text-xs">
                      <span className="font-semibold text-orange-700">Prazo: </span>
                      {format(new Date(decisao.decisao.prazo_correcao), "PPP", { locale: ptBR })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
