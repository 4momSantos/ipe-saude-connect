import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAfastamentos } from '@/hooks/useAfastamentos';
import { Calendar, Info, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { RegistrarAfastamentoDialog } from '../RegistrarAfastamentoDialog';

interface AfastamentosTabProps {
  credenciadoId: string;
}

export function AfastamentosTab({ credenciadoId }: AfastamentosTabProps) {
  const { afastamentos, isLoading } = useAfastamentos(credenciadoId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const statusColors: Record<string, string> = {
    'pendente': 'bg-warning/10 text-warning border-warning/20',
    'aprovado': 'bg-success/10 text-success border-success/20',
    'rejeitado': 'bg-destructive/10 text-destructive border-destructive/20'
  };

  const tipoLabels: Record<string, string> = {
    'licenca': 'Licença',
    'ferias': 'Férias',
    'afastamento': 'Afastamento'
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando afastamentos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Licenças e Afastamentos</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Afastamento
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Registre aqui suas licenças, férias ou afastamentos. 
          Estas informações serão analisadas pela gestão.
        </AlertDescription>
      </Alert>

      {!afastamentos || afastamentos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum afastamento registrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {afastamentos.map((af) => (
            <Card key={af.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{tipoLabels[af.tipo]}</Badge>
                      <Badge className={statusColors[af.status]}>
                        {af.status.charAt(0).toUpperCase() + af.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Período</p>
                        <p className="font-medium">
                          {format(new Date(af.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                          {af.data_fim && (
                            <> até {format(new Date(af.data_fim), 'dd/MM/yyyy', { locale: ptBR })}</>
                          )}
                        </p>
                      </div>
                      
                      {af.motivo && (
                        <div>
                          <p className="text-muted-foreground">Motivo</p>
                          <p className="font-medium">{af.motivo}</p>
                        </div>
                      )}
                      
                      <div>
                        <p className="text-muted-foreground">Justificativa</p>
                        <p className="text-foreground">{af.justificativa}</p>
                      </div>
                      
                      {af.observacoes_analise && (
                        <div className="pt-2 border-t">
                          <p className="text-muted-foreground">Observações da Análise</p>
                          <p className="text-foreground">{af.observacoes_analise}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(af.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RegistrarAfastamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        credenciadoId={credenciadoId}
      />
    </div>
  );
}
