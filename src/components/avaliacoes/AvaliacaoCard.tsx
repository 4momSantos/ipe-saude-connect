import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Building, Stethoscope } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AvaliacaoPublica } from "@/types/avaliacoes";

interface AvaliacaoCardProps {
  avaliacao: AvaliacaoPublica;
}

export function AvaliacaoCard({ avaliacao }: AvaliacaoCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovada': return 'bg-green-500';
      case 'pendente': return 'bg-yellow-500';
      case 'rejeitada': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {avaliacao.avaliador_anonimo ? 'Anônimo' : avaliacao.avaliador_nome || 'Sem nome'}
                </span>
                {avaliacao.avaliador_verificado && (
                  <Badge variant="secondary" className="text-xs">✓ Verificado</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= avaliacao.nota_estrelas
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="text-sm text-muted-foreground ml-2">
                  {format(new Date(avaliacao.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
            <Badge className={getStatusColor(avaliacao.status)}>
              {avaliacao.status === 'aprovada' ? 'Aprovada' : 
               avaliacao.status === 'pendente' ? 'Pendente' : 
               avaliacao.status === 'rejeitada' ? 'Rejeitada' : 'Reportada'}
            </Badge>
          </div>

          {/* AVALIAÇÃO DO ESTABELECIMENTO */}
          <div className="space-y-2 border-l-2 border-primary pl-3">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Estabelecimento</span>
            </div>
            <p className="text-sm">{avaliacao.comentario}</p>
          </div>

          {/* AVALIAÇÃO DO PROFISSIONAL (se existir) */}
          {avaliacao.profissional_id && avaliacao.nota_profissional && (
            <div className="space-y-2 border-l-2 border-blue-500 pl-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">
                  Profissional: {avaliacao.profissionais_credenciados?.nome || 'Nome não disponível'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-3 w-3 ${
                      star <= avaliacao.nota_profissional!
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              {avaliacao.comentario_profissional && (
                <p className="text-sm">{avaliacao.comentario_profissional}</p>
              )}
            </div>
          )}

          {/* Metadados */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {avaliacao.tipo_servico && (
              <Badge variant="outline">{avaliacao.tipo_servico}</Badge>
            )}
            {avaliacao.data_atendimento && (
              <Badge variant="outline">
                Atendimento em {format(new Date(avaliacao.data_atendimento), "dd/MM/yyyy")}
              </Badge>
            )}
          </div>

          {/* Resposta do profissional */}
          {avaliacao.resposta_profissional && (
            <div className="mt-4 p-3 bg-muted rounded-md border-l-4 border-primary">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Resposta do Profissional</span>
                {avaliacao.respondido_em && (
                  <span className="text-xs text-muted-foreground">
                    em {format(new Date(avaliacao.respondido_em), "dd/MM/yyyy")}
                  </span>
                )}
              </div>
              <p className="text-sm">{avaliacao.resposta_profissional}</p>
            </div>
          )}

          {/* Denúncia */}
          {avaliacao.denunciada && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600 dark:text-red-400">
              ⚠️ Esta avaliação foi denunciada
              {avaliacao.motivo_denuncia && `: ${avaliacao.motivo_denuncia}`}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
