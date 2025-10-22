import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, Clock, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Decisao } from "@/types/decisao";
import { useState } from "react";
import { CorrecaoInscricaoDialog } from "./CorrecaoInscricaoDialog";

interface DecisaoCardProps {
  decisao: Decisao;
  analistaNome?: string;
  dataDecisao?: string;
  inscricaoId: string;
  podeCorrigir?: boolean;
}

export function DecisaoCard({ decisao, analistaNome, dataDecisao, inscricaoId, podeCorrigir = false }: DecisaoCardProps) {
  const [correcaoOpen, setCorrecaoOpen] = useState(false);

  const statusConfig = {
    aprovado: {
      icon: CheckCircle2,
      label: 'Aprovado',
      variant: 'default' as const,
      color: 'text-green-600 dark:text-green-400'
    },
    reprovado: {
      icon: XCircle,
      label: 'Reprovado',
      variant: 'destructive' as const,
      color: 'text-red-600 dark:text-red-400'
    },
    pendente_correcao: {
      icon: AlertTriangle,
      label: 'Pendente Correção',
      variant: 'outline' as const,
      color: 'text-yellow-600 dark:text-yellow-400'
    }
  };

  const config = statusConfig[decisao.status];
  const Icon = config.icon;

  return (
    <>
      <Card className="border-l-4" style={{
        borderLeftColor: decisao.status === 'aprovado' ? 'hsl(var(--success))' :
                         decisao.status === 'reprovado' ? 'hsl(var(--destructive))' :
                         'hsl(var(--warning))'
      }}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${config.color}`} />
              <CardTitle className="text-lg">Decisão Formal</CardTitle>
            </div>
            <Badge variant={config.variant}>
              {config.label}
            </Badge>
          </div>
          {analistaNome && (
            <p className="text-sm text-muted-foreground">
              Analisado por: {analistaNome}
            </p>
          )}
          {dataDecisao && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(dataDecisao), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Justificativa */}
          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Justificativa
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {decisao.justificativa}
            </p>
          </div>

          {/* Campos Reprovados */}
          {decisao.campos_reprovados && decisao.campos_reprovados.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 text-red-600 dark:text-red-400">
                Campos que precisam ser corrigidos:
              </h4>
              <div className="space-y-2">
                {decisao.campos_reprovados.map((campo, idx) => (
                  <Alert key={idx} variant="destructive">
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-semibold">
                          {campo.secao} → {campo.campo}
                        </p>
                        <p className="text-sm">{campo.motivo}</p>
                        {campo.valor_atual && (
                          <p className="text-xs">
                            Valor atual: <span className="font-mono">{campo.valor_atual}</span>
                          </p>
                        )}
                        {campo.valor_esperado && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Valor esperado: <span className="font-mono">{campo.valor_esperado}</span>
                          </p>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Documentos Reprovados */}
          {decisao.documentos_reprovados && decisao.documentos_reprovados.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 text-red-600 dark:text-red-400">
                Documentos que precisam ser reenviados:
              </h4>
              <div className="space-y-2">
                {decisao.documentos_reprovados.map((doc, idx) => (
                  <Alert key={idx} variant="destructive">
                    <AlertDescription>
                      <div className="space-y-1">
                        <p className="font-semibold">{doc.tipo_documento}</p>
                        <p className="text-sm">{doc.motivo}</p>
                        <p className="text-xs">
                          Ação: <Badge variant="outline" className="ml-1">
                            {doc.acao_requerida === 'reenviar' ? 'Reenviar documento' :
                             doc.acao_requerida === 'complementar' ? 'Complementar informações' :
                             'Corrigir documento'}
                          </Badge>
                        </p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {/* Prazo para Correção */}
          {decisao.prazo_correcao && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold">Prazo para correção</p>
                <p className="text-sm">
                  {format(new Date(decisao.prazo_correcao), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Próxima Etapa */}
          {decisao.proxima_etapa && (
            <div className="pt-2 border-t">
              <p className="text-sm">
                <span className="font-semibold">Próxima etapa:</span>{' '}
                <span className="text-muted-foreground">{decisao.proxima_etapa}</span>
              </p>
            </div>
          )}

          {/* Botão de Correção */}
          {podeCorrigir && (decisao.status === 'reprovado' || decisao.status === 'pendente_correcao') && (
            <div className="pt-2">
              <Button 
                onClick={() => setCorrecaoOpen(true)}
                className="w-full"
                variant="default"
              >
                <FileText className="h-4 w-4 mr-2" />
                Corrigir Inscrição
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CorrecaoInscricaoDialog
        open={correcaoOpen}
        onOpenChange={setCorrecaoOpen}
        inscricaoId={inscricaoId}
        decisao={decisao}
      />
    </>
  );
}
