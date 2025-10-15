import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, XCircle, AlertCircle, ArrowLeft } from "lucide-react";
import type { Decisao } from "@/types/decisao";

interface DecisaoPreviewProps {
  decisao: Decisao;
  onConfirm: () => void;
  onEdit: () => void;
  isSubmitting: boolean;
}

export function DecisaoPreview({ decisao, onConfirm, onEdit, isSubmitting }: DecisaoPreviewProps) {
  const statusConfig = {
    aprovado: {
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      label: "APROVADO"
    },
    reprovado: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      label: "REPROVADO"
    },
    pendente_correcao: {
      icon: AlertCircle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      label: "CORREÇÃO SOLICITADA"
    }
  };

  const config = statusConfig[decisao.status];
  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onEdit} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-lg font-semibold">Revisar Decisão</h3>
      </div>

      {/* Status */}
      <div className={`p-6 rounded-lg border-2 ${config.bg} ${config.border}`}>
        <div className="flex items-center gap-3">
          <Icon className={`h-8 w-8 ${config.color}`} />
          <div>
            <div className={`text-2xl font-bold ${config.color}`}>{config.label}</div>
            <div className="text-sm text-muted-foreground">
              Esta decisão será registrada permanentemente no sistema
            </div>
          </div>
        </div>
      </div>

      {/* Justificativa */}
      <div className="space-y-2">
        <h4 className="font-semibold">Justificativa</h4>
        <div className="p-4 bg-muted rounded-lg">
          <p className="whitespace-pre-wrap">{decisao.justificativa}</p>
        </div>
      </div>

      {/* Campos Reprovados */}
      {decisao.campos_reprovados && decisao.campos_reprovados.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Campos com Problemas ({decisao.campos_reprovados.length})</h4>
          <div className="space-y-2">
            {decisao.campos_reprovados.map((campo, idx) => (
              <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="font-medium text-sm">
                  {campo.secao} → {campo.campo.replace(/_/g, ' ')}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{campo.motivo}</p>
                {campo.valor_atual && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Valor atual: <span className="font-mono">{campo.valor_atual}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documentos Reprovados */}
      {decisao.documentos_reprovados && decisao.documentos_reprovados.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold">Documentos com Problemas ({decisao.documentos_reprovados.length})</h4>
          <div className="space-y-2">
            {decisao.documentos_reprovados.map((doc, idx) => (
              <div key={idx} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="font-medium text-sm">{doc.tipo_documento}</div>
                <p className="text-sm text-muted-foreground mt-1">{doc.motivo}</p>
                <div className="text-xs text-orange-700 mt-1 font-semibold">
                  Ação: {doc.acao_requerida === 'reenviar' ? 'Reenviar documento' : 
                          doc.acao_requerida === 'complementar' ? 'Complementar informações' : 
                          'Corrigir dados/assinatura'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prazo de Correção */}
      {decisao.prazo_correcao && (
        <div className="space-y-2">
          <h4 className="font-semibold">Prazo para Correção</h4>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="font-semibold text-orange-800">
              {format(decisao.prazo_correcao, "PPP", { locale: ptBR })}
            </p>
          </div>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="flex gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onEdit} disabled={isSubmitting} className="flex-1">
          Editar Decisão
        </Button>
        <Button 
          onClick={onConfirm} 
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Registrando...' : 'Confirmar e Registrar'}
        </Button>
      </div>
    </div>
  );
}
