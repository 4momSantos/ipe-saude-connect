import { useGeneratedDocuments } from '@/hooks/useGeneratedDocuments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';

interface DocumentosGeradosProps {
  credenciadoId: string;
}

export function DocumentosGerados({ credenciadoId }: DocumentosGeradosProps) {
  const { data: documentos, isLoading } = useGeneratedDocuments(credenciadoId);

  if (isLoading) {
    return <div>Carregando documentos...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos Gerados Automaticamente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!documentos || documentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum documento gerado automaticamente ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {documentos.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{doc.template?.nome || doc.tipo_documento}</span>
                    {doc.assinado && (
                      <Badge className="bg-[hsl(var(--green-approved))]">Assinado</Badge>
                    )}
                    {doc.requer_assinatura && !doc.assinado && (
                      <Badge variant="outline">Aguardando Assinatura</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gerado em: {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  {doc.status_anterior && (
                    <p className="text-xs text-muted-foreground">
                      {doc.status_anterior} → {doc.status_novo}
                    </p>
                  )}
                </div>
                
                {doc.documento_pdf_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={doc.documento_pdf_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
