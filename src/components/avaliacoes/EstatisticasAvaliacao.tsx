import { Award, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Stars } from './Stars';
import { useEstatisticasCredenciado } from '@/hooks/useEstatisticasCredenciado';
import { cn } from '@/lib/utils';
import type { EstatisticasCredenciado } from '@/types/avaliacoes';

interface EstatisticasAvaliacaoProps {
  credenciadoId: string;
  variant?: 'default' | 'compact';
}

const badgeLabels: Record<string, string> = {
  top_rated: 'Top Rated',
  verificado: 'Verificado',
  popular: 'Popular',
  qualidade_premium: 'Qualidade Premium',
};

const badgeColors: Record<string, string> = {
  top_rated: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  verificado: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  popular: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  qualidade_premium: 'bg-green-500/10 text-green-700 dark:text-green-400',
};

export function EstatisticasAvaliacao({ credenciadoId, variant = 'default' }: EstatisticasAvaliacaoProps) {
  const { data: stats, isLoading } = useEstatisticasCredenciado(credenciadoId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total_avaliacoes_publicas === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Sem avaliações públicas</h3>
          <p className="text-sm text-muted-foreground">
            Este profissional ainda não possui avaliações de pacientes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const distribuicao = stats.distribuicao_notas as Record<string, number>;
  const totalAvaliacoes = stats.total_avaliacoes_publicas;
  const notaMedia = stats.nota_media_publica || 0;
  const badges = (stats.badges as string[]) || [];

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-4xl font-bold">{notaMedia.toFixed(1)}</div>
          <Stars value={notaMedia} size="lg" className="mt-1" />
          <p className="text-sm text-muted-foreground mt-1">
            {totalAvaliacoes} {totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}
          </p>
        </div>
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <Badge key={badge} className={cn('gap-1', badgeColors[badge])}>
                <Award className="h-3 w-3" />
                {badgeLabels[badge] || badge}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Estatísticas de Avaliação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Nota Média Grande */}
        <div className="flex items-start gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold">{notaMedia.toFixed(1)}</div>
            <Stars value={notaMedia} size="xl" className="mt-2 justify-center" />
            <p className="text-sm text-muted-foreground mt-2">
              {totalAvaliacoes} {totalAvaliacoes === 1 ? 'avaliação' : 'avaliações'}
            </p>
          </div>

          {/* Distribuição de Notas */}
          <div className="flex-1 space-y-2">
            {[5, 4, 3, 2, 1].map((estrelas) => {
              const count = distribuicao[estrelas.toString()] || 0;
              const percentage = totalAvaliacoes > 0 ? (count / totalAvaliacoes) * 100 : 0;

              return (
                <div key={estrelas} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-16">
                    <span className="text-sm font-medium">{estrelas}</span>
                    <Stars value={1} max={1} size="sm" />
                  </div>
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Taxa de Satisfação */}
        {stats.taxa_satisfacao !== null && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de Satisfação</span>
              <span className="text-sm font-bold">{stats.taxa_satisfacao.toFixed(1)}%</span>
            </div>
            <Progress value={stats.taxa_satisfacao} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              Percentual de avaliações com 4 ou 5 estrelas
            </p>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3">Selos de Qualidade</h4>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge} className={cn('gap-1.5 py-1.5 px-3', badgeColors[badge])}>
                  <Award className="h-4 w-4" />
                  {badgeLabels[badge] || badge}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Performance Score (se disponível) */}
        {stats.performance_score !== null && stats.performance_score > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Performance Score</span>
              <span className="text-lg font-bold">{stats.performance_score}/100</span>
            </div>
            <Progress value={stats.performance_score} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
