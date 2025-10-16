import { Fragment } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BadgeCheck, Flag, MessageSquare, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Stars } from './Stars';
import { useAvaliacoesPublicas } from '@/hooks/useAvaliacoesPublicas';
import type { AvaliacaoPublica } from '@/types/avaliacoes';

interface ListaAvaliacoesPublicasProps {
  credenciadoId: string;
  filtros?: {
    nota_minima?: number;
    ordenacao?: 'recentes' | 'relevantes' | 'maiores_notas' | 'menores_notas';
  };
  limit?: number;
}

export function ListaAvaliacoesPublicas({
  credenciadoId,
  filtros,
  limit,
}: ListaAvaliacoesPublicasProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useAvaliacoesPublicas(credenciadoId, filtros);

  const avaliacoes = data?.pages.flatMap((page) => page.avaliacoes) || [];
  const totalCount = data?.pages[0]?.count || 0;

  // Se houver limit, pegar apenas os primeiros N
  const avaliacoesExibidas = limit ? avaliacoes.slice(0, limit) : avaliacoes;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (avaliacoes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma avaliação ainda</h3>
          <p className="text-sm text-muted-foreground">
            Seja o primeiro a avaliar este profissional!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'avaliação' : 'avaliações'}
        </p>
      </div>

      {avaliacoesExibidas.map((avaliacao, index) => (
        <Fragment key={avaliacao.id}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {avaliacao.avaliador_anonimo
                            ? 'Avaliação Anônima'
                            : avaliacao.avaliador_nome || 'Usuário'}
                        </span>
                        {avaliacao.avaliador_verificado && (
                          <Badge variant="secondary" className="gap-1">
                            <BadgeCheck className="h-3 w-3" />
                            Verificado
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(avaliacao.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Stars value={avaliacao.nota_estrelas} size="sm" />
                  </div>

                  {/* Tipo de serviço */}
                  {avaliacao.tipo_servico && (
                    <Badge variant="outline">{avaliacao.tipo_servico}</Badge>
                  )}

                  {/* Comentário */}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {avaliacao.comentario}
                  </p>

                  {/* Resposta do Profissional */}
                  {avaliacao.resposta_profissional && (
                    <div className="mt-4 rounded-lg bg-muted/50 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">Resposta do Profissional</span>
                        <span className="text-xs text-muted-foreground">
                          •{' '}
                          {formatDistanceToNow(new Date(avaliacao.respondido_em!), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {avaliacao.resposta_profissional}
                      </p>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Flag className="h-3 w-3 mr-1" />
                      Denunciar
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {index < avaliacoesExibidas.length - 1 && <Separator />}
        </Fragment>
      ))}

      {/* Botão "Carregar Mais" */}
      {!limit && hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Carregando...' : 'Carregar Mais Avaliações'}
          </Button>
        </div>
      )}
    </div>
  );
}
