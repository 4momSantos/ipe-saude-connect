import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Eye, Download, AlertTriangle, Clock, CheckCircle, FileText, RefreshCw, X } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UploadDocumentoModal } from '@/components/documentos/UploadDocumentoModal';
import { DocumentViewer } from '@/components/documentos/DocumentViewer';
import { AdvancedFilters } from './AdvancedFilters';
import { VencimentosTimeline } from './VencimentosTimeline';
import { useFilterPreferences } from '@/hooks/useFilterPreferences';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { toast } from 'sonner';
import { StatusBadge } from './StatusBadge';
import { DashboardKPIs } from './DashboardKPIs';
import { DocumentoHistorico } from './DocumentoHistorico';
import { EditarDataVencimento } from './EditarDataVencimento';
import { AcoesEmMassa } from './AcoesEmMassa';
import { BuscaDocumentos } from '@/components/documentos/BuscaDocumentos';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, List } from 'lucide-react';

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

interface DocumentoComOrigem extends PrazoDocumento {
  origem?: string;
  tipo_documento?: string;
  numero_documento?: string;
}

export function DocumentosCredenciadosTab() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [documentViewer, setDocumentViewer] = useState<{ open: boolean; url: string; fileName: string } | null>(null);
  
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null);
  const [filtroSituacaoPrazo, setFiltroSituacaoPrazo] = useState<string | null>(null);
  const [filtroTipoDoc, setFiltroTipoDoc] = useState<string[]>([]);
  const [incluirArquivados, setIncluirArquivados] = useState(false);
  
  // Ações em massa
  const [documentosSelecionados, setDocumentosSelecionados] = useState<string[]>([]);

  // Preferências de filtros persistentes
  const { preferences, savePreferences } = useFilterPreferences('prazos-documentos');

  // Carregar preferências salvas ao montar
  useEffect(() => {
    if (preferences) {
      setSearchQuery(preferences.searchQuery || '');
      setFiltroStatus(preferences.filtroStatus || null);
      setFiltroSituacaoPrazo(preferences.filtroSituacaoPrazo || null);
      setFiltroTipoDoc(preferences.filtroTipoDoc || []);
      setIncluirArquivados(preferences.incluirArquivados || false);
    }
  }, [preferences]);

  // Salvar preferências quando mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      savePreferences({
        searchQuery,
        filtroStatus,
        filtroSituacaoPrazo,
        filtroTipoDoc,
        incluirArquivados
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, filtroStatus, filtroSituacaoPrazo, filtroTipoDoc, incluirArquivados]);

  // Buscar prazos que são de documentos de credenciados
  const { data: documentos, isLoading, refetch } = useQuery({
    queryKey: ['prazos-documentos'],
    queryFn: async () => {
      let query = supabase
        .from('v_prazos_completos')
        .select('*')
        .eq('entidade_tipo', 'documento_credenciado');

      // Filtro de status (arquivados)
      if (!incluirArquivados) {
        query = query.neq('status_atual', 'arquivado');
      }

      const { data: prazos, error } = await query.order('dias_para_vencer', { ascending: true });

      if (error) throw error;

      // Buscar origem e dados adicionais dos documentos
      const prazosIds = prazos?.map(p => p.entidade_id) || [];
      const { data: docs } = await supabase
        .from('documentos_credenciados')
        .select('id, origem, tipo_documento, numero_documento')
        .in('id', prazosIds);

      // Mapear dados para cada prazo
      const docsMap = new Map(docs?.map(d => [d.id, d]));
      const documentosComOrigem = prazos?.map(p => {
        const docData = docsMap.get(p.entidade_id);
        return {
          ...p,
          origem: docData?.origem || 'upload_manual',
          tipo_documento: docData?.tipo_documento,
          numero_documento: docData?.numero_documento
        };
      }) as DocumentoComOrigem[];

      return documentosComOrigem;
    }
  });

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('documentos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos_credenciados'
        },
        (payload) => {
          console.log('[REALTIME] Documento atualizado:', payload);
          queryClient.invalidateQueries({ queryKey: ['prazos-documentos'] });
          
          if (payload.eventType === 'INSERT') {
            toast.info('Novo documento adicionado!', {
              description: 'A lista foi atualizada automaticamente.'
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'controle_prazos'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['prazos-documentos'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Aplicar filtros
  const documentosFiltrados = documentos?.filter(doc => {
    // Filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matches = 
        doc.credenciado_nome?.toLowerCase().includes(query) ||
        doc.entidade_nome?.toLowerCase().includes(query) ||
        doc.tipo_documento?.toLowerCase().includes(query) ||
        doc.numero_documento?.toLowerCase().includes(query);
      if (!matches) return false;
    }

    // Filtro de situação de prazo
    if (filtroSituacaoPrazo) {
      if (filtroSituacaoPrazo === 'vencido' && doc.dias_para_vencer >= 0) return false;
      if (filtroSituacaoPrazo === 'critico' && (doc.dias_para_vencer < 0 || doc.dias_para_vencer > 7)) return false;
      if (filtroSituacaoPrazo === 'atencao' && (doc.dias_para_vencer < 7 || doc.dias_para_vencer > 15)) return false;
      if (filtroSituacaoPrazo === 'normal' && (doc.dias_para_vencer < 15 || doc.dias_para_vencer > 30)) return false;
      if (filtroSituacaoPrazo === 'valido' && doc.dias_para_vencer < 30) return false;
    }

    // Filtro de tipo de documento
    if (filtroTipoDoc.length > 0 && !filtroTipoDoc.includes(doc.tipo_documento || doc.entidade_nome)) {
      return false;
    }

    // Filtro de status básico (compatibilidade)
    if (filtroStatus) {
      if (filtroStatus === 'ativo' && doc.status_atual !== 'valido') return false;
      if (filtroStatus === 'vencendo' && !['atencao', 'vencendo'].includes(doc.nivel_alerta)) return false;
      if (filtroStatus === 'vencido' && doc.status_atual !== 'vencido') return false;
    }

    return true;
  }) || [];

  // Agrupar por credenciado
  const documentosAgrupados = documentosFiltrados.reduce((acc, doc) => {
    if (!acc[doc.credenciado_id]) {
      acc[doc.credenciado_id] = {
        credenciado_nome: doc.credenciado_nome,
        documentos: []
      };
    }
    acc[doc.credenciado_id].documentos.push(doc);
    return acc;
  }, {} as Record<string, { credenciado_nome: string; documentos: DocumentoComOrigem[] }>);

  // Tipos de documento disponíveis
  const tiposDisponiveis = Array.from(
    new Set(documentos?.map(d => d.tipo_documento || d.entidade_nome).filter(Boolean))
  ).sort() as string[];

  const totais = {
    ativo: documentosFiltrados.filter(d => d.status_atual === 'valido').length,
    vencendo: documentosFiltrados.filter(d => d.nivel_alerta === 'atencao' || d.nivel_alerta === 'vencendo').length,
    vencido: documentosFiltrados.filter(d => d.status_atual === 'vencido').length
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setFiltroStatus(null);
    setFiltroSituacaoPrazo(null);
    setFiltroTipoDoc([]);
    setIncluirArquivados(false);
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    if (!documentosFiltrados.length) {
      toast.error('Nenhum documento para exportar');
      return;
    }

    const exportData = documentosFiltrados.map(d => ({
      credenciado_nome: d.credenciado_nome,
      entidade_nome: d.entidade_nome,
      data_vencimento: d.data_vencimento,
      status_atual: d.status_atual,
      dias_para_vencer: d.dias_para_vencer
    }));

    const filename = `documentos-${formatDate(new Date(), 'yyyy-MM-dd')}`;
    
    if (format === 'csv') {
      exportToCSV(exportData, filename);
      toast.success('Arquivo CSV exportado com sucesso!');
    } else {
      exportToPDF(exportData, filename);
      toast.success('Arquivo PDF exportado com sucesso!');
    }
  };

  const handleViewDocument = async (entidadeId: string) => {
    const { data } = await supabase
      .from('documentos_credenciados')
      .select('url_arquivo, arquivo_nome')
      .eq('id', entidadeId)
      .single();
    
    if (data?.url_arquivo) {
      // url_arquivo contém o path no storage
      const { data: urlData } = supabase
        .storage
        .from('inscricao-documentos')
        .getPublicUrl(data.url_arquivo);
      
      if (urlData?.publicUrl) {
        setDocumentViewer({
          open: true,
          url: urlData.publicUrl,
          fileName: data.arquivo_nome || 'documento.pdf'
        });
      } else {
        toast.error('Erro ao gerar URL do documento');
      }
    } else {
      toast.error('Documento não encontrado');
    }
  };

  const getStatusIcon = (nivelAlerta: string) => {
    if (nivelAlerta === 'critico') return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (nivelAlerta === 'vencendo') return <Clock className="h-5 w-5 text-yellow-600" />;
    return <CheckCircle className="h-5 w-5 text-green-600" />;
  };

  // Skeleton screens
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-2">
                <Skeleton className="h-10 w-20 mx-auto" />
                <Skeleton className="h-4 w-24 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Skeleton className="h-12 w-full" />

        <div className="space-y-6">
          {[1, 2].map(grupo => (
            <div key={grupo} className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(doc => (
                  <Card key={doc}>
                    <CardHeader>
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-20 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <div className="flex gap-2 pt-2">
                        <Skeleton className="h-8 flex-1" />
                        <Skeleton className="h-8 flex-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Documentos e Prazos</h2>
          <p className="text-muted-foreground">
            Controle integrado de validade de documentos e prazos de credenciados
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Adicionar Documento
        </Button>
      </div>

      {/* Dashboard KPIs Completo */}
      <DashboardKPIs documentos={documentosFiltrados} />

      {/* Tabs para alternar entre vistas */}
      <Tabs defaultValue="busca" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="busca" className="gap-2">
            <Search className="h-4 w-4" />
            Busca Completa com Prazos e OCR
          </TabsTrigger>
          <TabsTrigger value="prazos" className="gap-2">
            <List className="h-4 w-4" />
            Vista de Prazos Avançada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="busca" className="space-y-4">
          <BuscaDocumentos 
            incluirPrazos={true} 
            incluirOCR={true}
            filtroInicial={{ agrupar_por: 'credenciado' }}
          />
        </TabsContent>

        <TabsContent value="prazos" className="space-y-4">

      {/* Ações em Massa */}
      {documentosSelecionados.length > 0 && (
        <AcoesEmMassa
          documentosSelecionados={documentosSelecionados}
          onClearSelection={() => setDocumentosSelecionados([])}
        />
      )}

      {/* Filtros Avançados */}
      <AdvancedFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filtroSituacaoPrazo={filtroSituacaoPrazo}
        onFiltroSituacaoChange={setFiltroSituacaoPrazo}
        filtroTipoDoc={filtroTipoDoc}
        onFiltroTipoDocChange={setFiltroTipoDoc}
        tiposDisponiveis={tiposDisponiveis}
        onClearFilters={handleClearFilters}
        onExport={handleExport}
        onRefresh={() => refetch()}
        incluirArquivados={incluirArquivados}
        onIncluirArquivadosChange={setIncluirArquivados}
      />

      {/* Timeline de Vencimentos */}
      {documentosFiltrados.length > 0 && (
        <VencimentosTimeline documentos={documentosFiltrados} />
      )}

      {/* Estado Vazio */}
      {!isLoading && documentosFiltrados.length === 0 && (
        <div className="text-center py-12 space-y-4">
          <div className="flex justify-center">
            <div className="bg-muted rounded-full p-6">
              <FileText className="w-16 h-16 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold">
              {searchQuery || filtroSituacaoPrazo || filtroTipoDoc.length > 0
                ? 'Nenhum resultado encontrado'
                : 'Nenhum documento cadastrado'}
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              {searchQuery || filtroSituacaoPrazo || filtroTipoDoc.length > 0
                ? 'Tente ajustar os filtros ou fazer uma nova busca'
                : 'Os documentos dos candidatos aprovados aparecerão aqui automaticamente'}
            </p>
          </div>
          <div className="flex justify-center gap-3">
            {(searchQuery || filtroSituacaoPrazo || filtroTipoDoc.length > 0) && (
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
            <Button onClick={() => setModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Adicionar Documento
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>
      )}

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
                           <div className="space-y-1">
                             <CardTitle className="text-base">{doc.entidade_nome}</CardTitle>
                             <div className="flex gap-2">
                               {/* Badge de Status */}
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
                           </div>
                         </div>
                       </div>
                     </CardHeader>

                     <CardContent className="space-y-3">
                       <div className="text-sm space-y-2">
                         {/* Badge de Origem */}
                         {doc.origem && (
                           <div className="mb-2">
                             <Badge variant={doc.origem === 'migrado' ? 'secondary' : 'default'}>
                               {doc.origem === 'migrado' ? '📋 Da Inscrição' : '📤 Upload Manual'}
                             </Badge>
                           </div>
                         )}
                         
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Vencimento:</span>
                            <span className="font-medium">
                              {formatDate(new Date(doc.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
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
                           onClick={() => handleViewDocument(doc.entidade_id)}
                         >
                           <Eye className="h-3 w-3 mr-1" />
                           Ver
                         </Button>
                         <Button
                           size="sm"
                           variant="outline"
                           className="flex-1"
                           onClick={async () => {
                             try {
                               const { data } = await supabase
                                 .from('documentos_credenciados')
                                 .select('url_arquivo, arquivo_nome')
                                 .eq('id', doc.entidade_id)
                                 .single();
                               
                               if (data?.url_arquivo) {
                                 // url_arquivo contém o path no storage
                                 const { data: urlData } = supabase
                                   .storage
                                   .from('inscricao-documentos')
                                   .getPublicUrl(data.url_arquivo);
                                 
                                 if (urlData?.publicUrl) {
                                   // Fazer download do arquivo
                                   const response = await fetch(urlData.publicUrl);
                                   const blob = await response.blob();
                                   const url = window.URL.createObjectURL(blob);
                                   const a = document.createElement('a');
                                   a.href = url;
                                   a.download = data.arquivo_nome || 'documento.pdf';
                                   document.body.appendChild(a);
                                   a.click();
                                   window.URL.revokeObjectURL(url);
                                   document.body.removeChild(a);
                                   toast.success('Download iniciado!');
                                 } else {
                                   toast.error('Erro ao gerar URL do documento');
                                 }
                               } else {
                                 toast.error('Documento não encontrado');
                               }
                             } catch (error) {
                               console.error('Erro ao baixar documento:', error);
                               toast.error('Erro ao baixar documento');
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

      {/* Visualizador de Documentos */}
      {documentViewer && (
        <DocumentViewer
          open={documentViewer.open}
          onClose={() => setDocumentViewer(null)}
          fileUrl={documentViewer.url}
          fileName={documentViewer.fileName}
        />
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
