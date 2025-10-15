import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History, Plus, Minus, RefreshCw, Star, TrendingUp } from 'lucide-react';
import { useHistoricoCategorizacao } from '@/hooks/useHistoricoCategorizacao';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface HistoricoCategorizacaoProps {
  credenciadoId: string;
}

export function HistoricoCategorizacao({ credenciadoId }: HistoricoCategorizacaoProps) {
  const { historico, stats, isLoading, error } = useHistoricoCategorizacao(credenciadoId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <History className="h-5 w-5" />
            Erro ao Carregar Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getOperationIcon = (tipo: string) => {
    switch (tipo) {
      case 'inclusao':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'remocao':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'alteracao':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return <History className="h-4 w-4" />;
    }
  };

  const getOperationBadgeVariant = (tipo: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (tipo) {
      case 'inclusao':
        return 'default';
      case 'remocao':
        return 'destructive';
      case 'alteracao':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getOperationLabel = (tipo: string) => {
    switch (tipo) {
      case 'inclusao':
        return 'Inclusão';
      case 'remocao':
        return 'Remoção';
      case 'alteracao':
        return 'Alteração';
      default:
        return tipo;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Categorização
        </CardTitle>
        <CardDescription>
          Registro completo de todas as alterações de categorias do estabelecimento
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                Total
              </div>
              <p className="text-2xl font-bold">{stats.total_alteracoes}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-green-600">
                <Plus className="h-3 w-3" />
                Inclusões
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.total_inclusoes}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-red-600">
                <Minus className="h-3 w-3" />
                Remoções
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.total_remocoes}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-sm text-yellow-600">
                <Star className="h-3 w-3" />
                Principal
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.total_alteracoes_principal}</p>
            </div>
          </div>
        )}

        {/* Lista de Alterações */}
        <div className="space-y-3">
          {historico && historico.length > 0 ? (
            historico.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getOperationIcon(item.tipo_operacao)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getOperationBadgeVariant(item.tipo_operacao)}>
                          {getOperationLabel(item.tipo_operacao)}
                        </Badge>
                        {item.principal_nova && (
                          <Badge variant="outline" className="gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            Principal
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm space-y-1">
                        {item.tipo_operacao === 'inclusao' && (
                          <p>
                            Nova categoria:{' '}
                            <span className="font-medium">{item.categoria_nova}</span>
                            {item.categoria_nova_codigo && (
                              <span className="text-muted-foreground"> ({item.categoria_nova_codigo})</span>
                            )}
                          </p>
                        )}
                        
                        {item.tipo_operacao === 'remocao' && (
                          <p>
                            Categoria removida:{' '}
                            <span className="font-medium">{item.categoria_anterior}</span>
                            {item.categoria_anterior_codigo && (
                              <span className="text-muted-foreground"> ({item.categoria_anterior_codigo})</span>
                            )}
                          </p>
                        )}
                        
                        {item.tipo_operacao === 'alteracao' && (
                          <>
                            <p>
                              De:{' '}
                              <span className="font-medium">{item.categoria_anterior}</span>
                              {item.categoria_anterior_codigo && (
                                <span className="text-muted-foreground"> ({item.categoria_anterior_codigo})</span>
                              )}
                            </p>
                            <p>
                              Para:{' '}
                              <span className="font-medium">{item.categoria_nova}</span>
                              {item.categoria_nova_codigo && (
                                <span className="text-muted-foreground"> ({item.categoria_nova_codigo})</span>
                              )}
                            </p>
                          </>
                        )}
                        
                        {item.justificativa && (
                          <p className="text-muted-foreground italic">{item.justificativa}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right text-xs text-muted-foreground space-y-1">
                      <p>{format(new Date(item.data_alteracao), "dd/MM/yyyy", { locale: ptBR })}</p>
                      <p>{format(new Date(item.data_alteracao), "HH:mm", { locale: ptBR })}</p>
                      {item.usuario_nome && (
                        <p className="font-medium text-foreground mt-2">{item.usuario_nome}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <Alert>
              <History className="h-4 w-4" />
              <AlertDescription>
                Nenhuma alteração de categoria registrada ainda.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
