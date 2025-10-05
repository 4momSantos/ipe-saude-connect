import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { FileText, CheckCircle2, XCircle, AlertCircle, Download, Eye } from 'lucide-react';
import { useInscricaoDocumentos, InscricaoDocumento } from '@/hooks/useInscricaoDocumentos';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DocumentosAnalistaViewProps {
  inscricaoId: string;
}

export function DocumentosAnalistaView({ inscricaoId }: DocumentosAnalistaViewProps) {
  const { documentos, isLoading, atualizarStatus } = useInscricaoDocumentos(inscricaoId);
  const [documentoSelecionado, setDocumentoSelecionado] = useState<InscricaoDocumento | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'validado':
        return <Badge variant="default" className="bg-success"><CheckCircle2 className="w-3 h-3 mr-1" />Validado</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  const handleAprovar = async (documentoId: string) => {
    await atualizarStatus.mutateAsync({
      documentoId,
      status: 'validado',
      observacoes: observacoes || undefined,
    });
    setDialogOpen(false);
    setObservacoes('');
  };

  const handleRejeitar = async (documentoId: string) => {
    if (!observacoes.trim()) {
      alert('Por favor, informe o motivo da rejeição');
      return;
    }
    await atualizarStatus.mutateAsync({
      documentoId,
      status: 'rejeitado',
      observacoes,
    });
    setDialogOpen(false);
    setObservacoes('');
  };

  const visualizarDocumento = (doc: InscricaoDocumento) => {
    setDocumentoSelecionado(doc);
    setObservacoes(doc.observacoes || '');
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-4">Carregando documentos...</div>;
  }

  if (!documentos.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhum documento enviado ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Documentos para Análise</h3>
          <Badge variant="outline">
            {documentos.filter(d => d.status === 'pendente').length} pendentes
          </Badge>
        </div>

        {documentos.map((doc) => (
          <Card key={doc.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-base">{doc.tipo_documento}</CardTitle>
                    <CardDescription className="text-sm">
                      {doc.arquivo_nome}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(doc.status)}
              </div>
            </CardHeader>
            <CardContent>
              {doc.ocr_processado && doc.ocr_resultado && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Dados Extraídos (OCR):</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(doc.ocr_resultado).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-muted-foreground">{key}:</span>{' '}
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                  {doc.ocr_confidence && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Confiança OCR: {(doc.ocr_confidence * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              )}

              {doc.observacoes && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Observações:</p>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">{doc.observacoes}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => visualizarDocumento(doc)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(doc.arquivo_url, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {documentoSelecionado && (
            <>
              <DialogHeader>
                <DialogTitle>{documentoSelecionado.tipo_documento}</DialogTitle>
                <DialogDescription>
                  Arquivo: {documentoSelecionado.arquivo_nome}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {documentoSelecionado.ocr_processado && documentoSelecionado.ocr_resultado && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Dados Extraídos (OCR)</h4>
                    <div className="p-3 bg-muted rounded-lg">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(documentoSelecionado.ocr_resultado, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold mb-2">Observações</h4>
                  <Textarea
                    placeholder="Adicione observações sobre este documento..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejeitar(documentoSelecionado.id)}
                    disabled={atualizarStatus.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    onClick={() => handleAprovar(documentoSelecionado.id)}
                    disabled={atualizarStatus.isPending}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Aprovar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
