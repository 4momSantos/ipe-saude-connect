import { useState } from 'react';
import { useCredenciadoAtual } from '@/hooks/useCredenciadoAtual';
import { useDocumentosCredenciado } from '@/hooks/useDocumentosCredenciado';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, AlertTriangle, CheckCircle, Clock, 
  Upload, Download, Eye, Calendar 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UploadDocumentoModal } from '@/components/documentos/UploadDocumentoModal';

export default function DocumentosCredenciadoGrid() {
  const { data: credenciado } = useCredenciadoAtual();
  const { documentos, isLoading } = useDocumentosCredenciado(credenciado?.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const documentosFiltrados = filtroStatus
    ? documentos?.filter(d => d.status === filtroStatus)
    : documentos;

  const totais = {
    ativo: documentos?.filter(d => d.status === 'ativo').length || 0,
    vencendo: documentos?.filter(d => d.status === 'vencendo').length || 0,
    vencido: documentos?.filter(d => d.status === 'vencido').length || 0
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      ativo: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'Ativo' },
      vencendo: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Vencendo' },
      vencido: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', label: 'Vencido' },
      em_renovacao: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Em Renovação' }
    };
    return configs[status as keyof typeof configs] || configs.ativo;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documentos do Credenciado</h1>
          <p className="text-muted-foreground">Gerencie a validade dos seus documentos</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      {/* Alertas de Vencimento */}
      {totais.vencido > 0 && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">
                {totais.vencido} documento(s) vencido(s)
              </p>
              <p className="text-sm text-red-700">
                Providencie a renovação imediatamente para evitar bloqueios
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        <Button
          variant={filtroStatus === null ? 'default' : 'outline'}
          onClick={() => setFiltroStatus(null)}
        >
          Todos ({documentos?.length || 0})
        </Button>
        <Button
          variant={filtroStatus === 'ativo' ? 'default' : 'outline'}
          onClick={() => setFiltroStatus('ativo')}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Ativos ({totais.ativo})
        </Button>
        <Button
          variant={filtroStatus === 'vencendo' ? 'default' : 'outline'}
          onClick={() => setFiltroStatus('vencendo')}
        >
          <Clock className="h-4 w-4 mr-2" />
          Vencendo ({totais.vencendo})
        </Button>
        <Button
          variant={filtroStatus === 'vencido' ? 'default' : 'outline'}
          onClick={() => setFiltroStatus('vencido')}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Vencidos ({totais.vencido})
        </Button>
      </div>

      {/* Grid de Documentos */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {documentosFiltrados?.map(doc => {
          const config = getStatusConfig(doc.status);
          const StatusIcon = config.icon;
          
          const diasRestantes = doc.data_vencimento
            ? Math.ceil((new Date(doc.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <StatusIcon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{doc.tipo_documento}</CardTitle>
                      {doc.numero_documento && (
                        <CardDescription className="text-xs">Nº {doc.numero_documento}</CardDescription>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className={config.bg}>
                    {config.label}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {doc.data_vencimento && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Vence em: {format(new Date(doc.data_vencimento), "dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                )}

                {diasRestantes !== null && (
                  <div className={`text-sm font-medium ${
                    diasRestantes < 0 ? 'text-red-600' :
                    diasRestantes <= 7 ? 'text-orange-600' :
                    diasRestantes <= 30 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {diasRestantes < 0 
                      ? `Vencido há ${Math.abs(diasRestantes)} dias`
                      : `${diasRestantes} dias restantes`
                    }
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {doc.url_arquivo && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(doc.url_arquivo, '_blank')}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const a = document.createElement('a');
                          a.href = doc.url_arquivo!;
                          a.download = doc.arquivo_nome || 'documento.pdf';
                          a.click();
                        }}
                        className="flex-1"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Baixar
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {documentosFiltrados?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum documento encontrado</p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Upload */}
      <UploadDocumentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        credenciadoId={credenciado?.id}
      />
    </div>
  );
}
