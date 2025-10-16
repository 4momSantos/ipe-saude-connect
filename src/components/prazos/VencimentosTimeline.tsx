import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Documento {
  id: string;
  entidade_nome: string;
  credenciado_nome: string;
  data_vencimento: string;
  dias_para_vencer: number;
}

interface VencimentosTimelineProps {
  documentos: Documento[];
}

export function VencimentosTimeline({ documentos }: VencimentosTimelineProps) {
  const proximosVencimentos = documentos
    .filter(d => d.dias_para_vencer >= 0 && d.dias_para_vencer <= 60)
    .sort((a, b) => a.dias_para_vencer - b.dias_para_vencer)
    .slice(0, 10);

  if (proximosVencimentos.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Próximos Vencimentos (60 dias)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {proximosVencimentos.map((doc) => {
            const percentual = 100 - (doc.dias_para_vencer / 60 * 100);
            const corBarra = 
              doc.dias_para_vencer <= 7 ? 'bg-red-500' :
              doc.dias_para_vencer <= 15 ? 'bg-orange-500' :
              doc.dias_para_vencer <= 30 ? 'bg-yellow-500' : 'bg-green-500';

            return (
              <div key={doc.id} className="flex items-center gap-4">
                <div className="text-center min-w-[60px]">
                  <div className="text-2xl font-bold">{doc.dias_para_vencer}</div>
                  <div className="text-xs text-muted-foreground">dias</div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full transition-all", corBarra)}
                      style={{ width: `${percentual}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{doc.entidade_nome}</div>
                      <div className="text-muted-foreground text-xs">{doc.credenciado_nome}</div>
                    </div>
                    <Badge variant="outline">
                      {format(new Date(doc.data_vencimento), 'dd/MM/yy', { locale: ptBR })}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
