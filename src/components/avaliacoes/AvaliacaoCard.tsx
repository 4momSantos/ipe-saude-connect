import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
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

          {/* Comentário */}
          <p className="text-sm">{avaliacao.comentario}</p>

          {/* Tipo de serviço */}
          {avaliacao.tipo_servico && (
            <div className="text-xs text-muted-foreground">
              Serviço: <span className="font-medium">{avaliacao.tipo_servico}</span>
            </div>
          )}

          {/* Data de atendimento */}
          {avaliacao.data_atendimento && (
            <div className="text-xs text-muted-foreground">
              Atendimento em: {format(new Date(avaliacao.data_atendimento), "dd/MM/yyyy")}
            </div>
          )}

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
