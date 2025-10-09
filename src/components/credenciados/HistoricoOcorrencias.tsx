import { useOcorrencias } from "@/hooks/useOcorrencias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

export function HistoricoOcorrencias({ credenciadoId }: { credenciadoId: string }) {
  const { ocorrencias, isLoading } = useOcorrencias(credenciadoId);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Carregando ocorrências...</div>;
  }

  if (ocorrencias.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            Nenhuma ocorrência registrada
          </div>
        </CardContent>
      </Card>
    );
  }

  const getGravidadeColor = (gravidade: string) => {
    switch (gravidade) {
      case 'critica': return 'destructive';
      case 'alta': return 'default';
      case 'media': return 'secondary';
      default: return 'outline';
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'reclamacao': return 'destructive';
      case 'advertencia': return 'default';
      case 'elogio': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Ocorrências
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {ocorrencias.map((oc) => (
            <div key={oc.id} className="border-l-4 border-orange-500 pl-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="flex gap-2">
                  <Badge variant={getTipoColor(oc.tipo)}>
                    {oc.tipo}
                  </Badge>
                  <Badge variant={getGravidadeColor(oc.gravidade)}>
                    {oc.gravidade}
                  </Badge>
                  <Badge variant="outline">
                    {oc.status}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {new Date(oc.data_ocorrencia).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-sm">{oc.descricao}</p>
              <p className="text-xs text-muted-foreground">
                Protocolo: {oc.protocolo}
              </p>
              {oc.providencias && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Providências:</strong> {oc.providencias}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
