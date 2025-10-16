import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Eye, Download, Calendar, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UploadDocumentoModal } from '@/components/documentos/UploadDocumentoModal';

interface PrazoDocumento {
  id: string;
  entidade_id: string;
  entidade_nome: string;
  credenciado_id: string;
  credenciado_nome: string;
  data_vencimento: string;
  dias_para_vencer: number;
  status_atual: string;
  nivel_alerta: string;
  cor_status: string;
  renovavel: boolean;
}

export function DocumentosCredenciadosTab() {
  const [modalOpen, setModalOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);

  // Buscar prazos que são de documentos de credenciados
  const { data: documentos, isLoading } = useQuery({
    queryKey: ['prazos-documentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_prazos_completos')
        .select('*')
        .eq('entidade_tipo', 'documento_credenciado')
        .order('dias_para_vencer', { ascending: true });

      if (error) throw error;
      return data as PrazoDocumento[];
    }
  });

  // Agrupar por credenciado
  const documentosAgrupados = documentos?.reduce((acc, doc) => {
    if (!acc[doc.credenciado_id]) {
      acc[doc.credenciado_id] = {
        credenciado_nome: doc.credenciado_nome,
        documentos: []
      };
    }
    acc[doc.credenciado_id].documentos.push(doc);
    return acc;
  }, {} as Record<string, { credenciado_nome: string; documentos: PrazoDocumento[] }>);

  const totais = {
    ativo: documentos?.filter(d => d.status_atual === 'valido').length || 0,
    vencendo: documentos?.filter(d => d.nivel_alerta === 'atencao' || d.nivel_alerta === 'vencendo').length || 0,
    vencido: documentos?.filter(d => d.status_atual === 'vencido').length || 0
  };

  const getStatusIcon = (nivelAlerta: string) => {
    if (nivelAlerta === 'critico') return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (nivelAlerta === 'vencendo') return <Clock className="h-5 w-5 text-yellow-600" />;
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentos dos Credenciados</h2>
          <p className="text-muted-foreground">
            Controle de validade de documentos (CNPJ, Alvarás, Certidões, etc)
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Adicionar Documento
        </Button>
      </div>

      {/* KPIs Mini */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{totais.ativo}</p>
              <p className="text-sm text-muted-foreground">Válidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{totais.vencendo}</p>
              <p className="text-sm text-muted-foreground">Vencendo</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{totais.vencido}</p>
              <p className="text-sm text-muted-foreground">Vencidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Grid de Documentos - Agrupados por Credenciado */}
      <div className="space-y-6">
        {Object.entries(documentosAgrupados || {}).map(([credenciadoId, grupo]) => {
          const docsDoCredenciado = filtroStatus
            ? grupo.documentos.filter(d => {
                if (filtroStatus === 'ativo') return d.status_atual === 'valido';
                if (filtroStatus === 'vencendo') return d.nivel_alerta === 'atencao' || d.nivel_alerta === 'vencendo';
                if (filtroStatus === 'vencido') return d.status_atual === 'vencido';
                return true;
              })
            : grupo.documentos;

          if (docsDoCredenciado.length === 0) return null;

          return (
            <div key={credenciadoId} className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {grupo.credenciado_nome}
                <Badge variant="secondary">{docsDoCredenciado.length} documentos</Badge>
              </h3>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {docsDoCredenciado.map((doc) => (
                  <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="p-2 rounded-lg" 
                            style={{ backgroundColor: doc.cor_status + '20' }}
                          >
                            {getStatusIcon(doc.nivel_alerta)}
                          </div>
                          <div>
                            <CardTitle className="text-base">{doc.entidade_nome}</CardTitle>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: doc.cor_status + '20',
                            color: doc.cor_status,
                            borderColor: doc.cor_status
                          }}
                        >
                          {doc.nivel_alerta === 'critico' ? 'Crítico' :
                           doc.nivel_alerta === 'vencendo' ? 'Vencendo' :
                           doc.nivel_alerta === 'atencao' ? 'Atenção' : 'Válido'}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="text-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Vencimento:</span>
                          <span className="font-medium">
                            {format(new Date(doc.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>

                        {doc.dias_para_vencer !== null && (
                          <div className={`font-medium ${
                            doc.dias_para_vencer < 0 ? 'text-red-600' :
                            doc.dias_para_vencer <= 7 ? 'text-orange-600' :
                            doc.dias_para_vencer <= 30 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {doc.dias_para_vencer < 0
                              ? `Vencido há ${Math.abs(doc.dias_para_vencer)} dias`
                              : `${doc.dias_para_vencer} dias restantes`
                            }
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={async () => {
                            // Buscar URL do documento
                            const { data } = await supabase
                              .from('documentos_credenciados')
                              .select('url_arquivo')
                              .eq('id', doc.entidade_id)
                              .single();
                            
                            if (data?.url_arquivo) {
                              window.open(data.url_arquivo, '_blank');
                            }
                          }}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={async () => {
                            const { data } = await supabase
                              .from('documentos_credenciados')
                              .select('url_arquivo, arquivo_nome')
                              .eq('id', doc.entidade_id)
                              .single();
                            
                            if (data?.url_arquivo) {
                              const a = document.createElement('a');
                              a.href = data.url_arquivo;
                              a.download = data.arquivo_nome || 'documento.pdf';
                              a.click();
                            }
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Upload */}
      <UploadDocumentoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
