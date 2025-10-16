import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDocumentosCredenciado } from '@/hooks/useDocumentosCredenciado';
import { Upload, Download, FileText, Calendar, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface DocumentosCredenciadoTabProps {
  credenciadoId: string;
}

export function DocumentosCredenciadoTab({ credenciadoId }: DocumentosCredenciadoTabProps) {
  const { documentos, isLoading } = useDocumentosCredenciado(credenciadoId);
  const [solicitarDocOpen, setSolicitarDocOpen] = useState(false);

  const statusColors: Record<string, string> = {
    'ativo': 'bg-success/10 text-success border-success/20',
    'vencendo': 'bg-warning/10 text-warning border-warning/20',
    'vencido': 'bg-destructive/10 text-destructive border-destructive/20',
    'em_renovacao': 'bg-primary/10 text-primary border-primary/20',
    'invalido': 'bg-muted text-muted-foreground'
  };

  const statusLabels: Record<string, string> = {
    'ativo': 'Ativo',
    'vencendo': 'Vencendo em breve',
    'vencido': 'Vencido',
    'em_renovacao': 'Em renovação',
    'invalido': 'Inválido'
  };

  const handleDownload = (doc: any) => {
    if (doc.url_arquivo) {
      window.open(doc.url_arquivo, '_blank');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando documentos...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Meus Documentos</h2>
        <Button onClick={() => setSolicitarDocOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Solicitar Atualização
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Mantenha seus documentos sempre atualizados. Documentos vencidos podem afetar seu credenciamento.
        </AlertDescription>
      </Alert>

      {!documentos || documentos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum documento encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documentos.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">{doc.tipo_documento}</h3>
                      <Badge className={statusColors[doc.status] || 'bg-muted'}>
                        {statusLabels[doc.status] || doc.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                      {doc.numero_documento && (
                        <div>
                          <p className="text-muted-foreground">Número</p>
                          <p className="font-medium">{doc.numero_documento}</p>
                        </div>
                      )}
                      {doc.data_emissao && (
                        <div>
                          <p className="text-muted-foreground">Emissão</p>
                          <p className="font-medium">
                            {format(new Date(doc.data_emissao), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      )}
                      {doc.data_vencimento && (
                        <div>
                          <p className="text-muted-foreground">Vencimento</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                      )}
                      {doc.arquivo_nome && (
                        <div>
                          <p className="text-muted-foreground">Arquivo</p>
                          <p className="font-medium truncate">{doc.arquivo_nome}</p>
                        </div>
                      )}
                    </div>

                    {doc.descricao && (
                      <p className="mt-3 text-sm text-muted-foreground">{doc.descricao}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {doc.url_arquivo && (
                      <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                        <Download className="mr-2 h-4 w-4" />
                        Baixar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
