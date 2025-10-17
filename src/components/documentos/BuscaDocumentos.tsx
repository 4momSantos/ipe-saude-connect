import { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Download, Eye, X, ArrowUpDown, FolderOpen, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBuscarDocumentos, FiltrosBusca, OrdenacaoTipo, ResultadoBusca } from '@/hooks/useBuscarDocumentos';
import { useTiposDocumentos } from '@/hooks/useTiposDocumentos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CredenciadoCard } from './CredenciadoCard';
import { DocumentoItem } from './DocumentoItem';
import { DadosOCRModal } from '@/components/prazos/DadosOCRModal';

interface BuscaDocumentosProps {
  incluirPrazos?: boolean;
  incluirOCR?: boolean;
  filtroInicial?: Partial<FiltrosBusca>;
}

export function BuscaDocumentos({ 
  incluirPrazos = false, 
  incluirOCR = false,
  filtroInicial = {}
}: BuscaDocumentosProps = {}) {
  const [termo, setTermo] = useState('');
  const [filtros, setFiltros] = useState<FiltrosBusca>({ 
    ordenacao: 'data_desc',
    agrupar_por: 'credenciado',
    ...filtroInicial
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [documentoOCRSelecionado, setDocumentoOCRSelecionado] = useState<ResultadoBusca | null>(null);
  
  const { resultados, credenciadosAgrupados, isLoading, isLoadingMore, hasMore, tempoExecucao, buscar, carregarMais, limpar } = useBuscarDocumentos();

  const { data: tiposDisponiveis = [] } = useTiposDocumentos();

  // Busca inicial ao carregar - mostra todos os documentos agrupados por credenciado
  useEffect(() => {
    buscar('', { 
      ...filtros, 
      ordenacao: 'data_desc',
      agrupar_por: 'credenciado'
    }, { incluirPrazos, incluirOCR });
  }, [incluirPrazos, incluirOCR]);

  // Scroll infinito
  useEffect(() => {
    const handleScroll = () => {
      const bottom = window.innerHeight + window.scrollY >= 
        document.documentElement.scrollHeight - 200;
      
      if (bottom && !isLoadingMore && hasMore && !isLoading) {
        carregarMais(termo, filtros, { incluirPrazos, incluirOCR });
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMore, termo, filtros, isLoading, incluirPrazos, incluirOCR]);

  // Agrupar resultados por tipo
  const resultadosAgrupados = useMemo(() => {
    if (filtros.agrupar_por !== 'tipo') {
      return { 'Todos': resultados };
    }

    return resultados.reduce((grupos, doc) => {
      const tipo = doc.tipo_documento || 'Sem tipo';
      if (!grupos[tipo]) {
        grupos[tipo] = [];
      }
      grupos[tipo].push(doc);
      return grupos;
    }, {} as Record<string, typeof resultados>);
  }, [resultados, filtros.agrupar_por]);

  const handleBuscar = () => {
    buscar(termo, filtros, { incluirPrazos, incluirOCR });
  };

  const handleLimpar = () => {
    setTermo('');
    setFiltros({ ordenacao: 'data_desc', agrupar_por: 'credenciado' });
    // Re-buscar todos os documentos
    buscar('', { ordenacao: 'data_desc', agrupar_por: 'credenciado' }, { incluirPrazos, incluirOCR });
  };

  const visualizarDocumento = async (arquivoUrl: string, nome: string) => {
    try {
      // Extrair o path do storage
      const path = arquivoUrl.replace('inscricao-documentos/', '');
      
      const { data, error } = await supabase.storage
        .from('inscricao-documentos')
        .createSignedUrl(path, 3600);
      
      if (error) throw error;
      
      if (data?.signedUrl) {
        // Tentar abrir em nova aba
        const newWindow = window.open(data.signedUrl, '_blank');
        
        // Se bloqueado por popup blocker ou extensão, fazer download automaticamente
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          toast.info('Popup bloqueado. Iniciando download...', {
            description: 'Desative bloqueadores de popup ou extensões de privacidade para visualizar diretamente'
          });
          
          // Fazer download como alternativa
          await baixarDocumento(arquivoUrl, nome);
        }
      }
    } catch (error: any) {
      console.error('Erro ao visualizar documento:', error);
      toast.error('Erro ao abrir documento: ' + error.message);
    }
  };

  const baixarDocumento = async (arquivoUrl: string, nome: string) => {
    try {
      const path = arquivoUrl.replace('inscricao-documentos/', '');
      
      const { data, error } = await supabase.storage
        .from('inscricao-documentos')
        .download(path);
      
      if (error) throw error;
      
      // Criar URL temporária e iniciar download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Download iniciado');
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast.error('Erro ao baixar documento: ' + error.message);
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" => {
    switch (status) {
      case 'validado':
      case 'aprovado':
        return 'default';
      case 'pendente':
        return 'secondary';
      case 'rejeitado':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Busca */}
      <Card className="p-6">
        <div className="flex gap-2">
          <Input
            placeholder="Buscar por nome, tipo, conteúdo do documento ou credenciado..."
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            className="flex-1"
            disabled={isLoading}
          />
          <Button onClick={handleBuscar} disabled={isLoading}>
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            disabled={isLoading}
          >
            <Filter className="h-4 w-4" />
          </Button>
          {(termo || resultados.length > 0) && (
            <Button variant="ghost" onClick={handleLimpar} disabled={isLoading}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtros Avançados */}
        {mostrarFiltros && (
          <div className="space-y-4 mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select 
                value={filtros.status} 
                onValueChange={(v) => setFiltros({...filtros, status: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status do Documento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="validado">Validado</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filtros.status_credenciado} 
                onValueChange={(v) => setFiltros({...filtros, status_credenciado: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status do Credenciado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Suspenso">Suspenso</SelectItem>
                  <SelectItem value="Descredenciado">Descredenciado</SelectItem>
                  <SelectItem value="Não Credenciado">Não Credenciado</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filtros.tipo_documento} 
                onValueChange={(v) => setFiltros({...filtros, tipo_documento: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de Documento" />
                </SelectTrigger>
                <SelectContent>
                  {tiposDisponiveis.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="Data Início"
                value={filtros.data_inicio || ''}
                onChange={(e) => setFiltros({...filtros, data_inicio: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                type="date"
                placeholder="Data Fim"
                value={filtros.data_fim || ''}
                onChange={(e) => setFiltros({...filtros, data_fim: e.target.value})}
              />

              <div className="flex items-center justify-between space-x-2 px-3 py-2 border rounded-md">
                <Label htmlFor="apenas-habilitados" className="cursor-pointer">Apenas habilitados</Label>
                <Switch
                  id="apenas-habilitados"
                  checked={filtros.apenas_habilitados ?? false}
                  onCheckedChange={(checked) => setFiltros({ ...filtros, apenas_habilitados: checked ? true : undefined })}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 px-3 py-2 border rounded-md">
                <Label htmlFor="apenas-com-numero" className="cursor-pointer">Apenas com número</Label>
                <Switch
                  id="apenas-com-numero"
                  checked={filtros.apenas_com_numero ?? false}
                  onCheckedChange={(checked) => setFiltros({ ...filtros, apenas_com_numero: checked ? true : undefined })}
                />
              </div>

              <div className="flex items-center justify-between space-x-2 px-3 py-2 border rounded-md">
                <Label htmlFor="incluir-nao-credenciados" className="cursor-pointer">Incluir não credenciados</Label>
                <Switch
                  id="incluir-nao-credenciados"
                  checked={filtros.incluir_nao_credenciados ?? false}
                  onCheckedChange={(checked) => setFiltros({ ...filtros, incluir_nao_credenciados: checked })}
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Controles de Ordenação e Agrupamento */}
      {resultados.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">
                {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
              </h3>
              <span className="text-sm text-muted-foreground">
                {tempoExecucao}ms
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Select 
                value={filtros.ordenacao || 'relevancia'} 
                onValueChange={(v: OrdenacaoTipo) => {
                  setFiltros({...filtros, ordenacao: v});
                  if (termo) buscar(termo, {...filtros, ordenacao: v});
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevancia">Relevância</SelectItem>
                  <SelectItem value="data_desc">Data (Mais recente)</SelectItem>
                  <SelectItem value="data_asc">Data (Mais antiga)</SelectItem>
                  <SelectItem value="nome_asc">Nome (A-Z)</SelectItem>
                  <SelectItem value="tipo_asc">Tipo (A-Z)</SelectItem>
                </SelectContent>
              </Select>

              <Select 
                value={filtros.agrupar_por || 'credenciado'} 
                onValueChange={(v: 'tipo' | 'nenhum' | 'credenciado') => setFiltros({...filtros, agrupar_por: v})}
              >
                <SelectTrigger className="w-[200px]">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credenciado">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Agrupar por Credenciado</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="tipo">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4" />
                      <span>Agrupar por Tipo</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="nenhum">Sem agrupamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <>
          {filtros.agrupar_por === 'credenciado' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {credenciadosAgrupados.map((credenciado) => (
                <CredenciadoCard
                  key={`${credenciado.credenciado_cpf}-${credenciado.credenciado_nome}`}
                  credenciadoNome={credenciado.credenciado_nome}
                  credenciadoCpf={credenciado.credenciado_cpf}
                  documentos={credenciado.documentos}
                  onVisualizar={visualizarDocumento}
                  onBaixar={baixarDocumento}
                  onVerOCR={incluirOCR ? setDocumentoOCRSelecionado : undefined}
                  showPrazo={incluirPrazos}
                />
              ))}
            </div>
          ) : filtros.agrupar_por === 'tipo' ? (
            <Card className="p-6">
              <Accordion type="multiple" defaultValue={Object.keys(resultadosAgrupados)} className="space-y-2">
                {Object.entries(resultadosAgrupados).map(([tipo, docs]) => (
                  <AccordionItem key={tipo} value={tipo} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-accent/50">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <span className="font-semibold">{tipo}</span>
                        <Badge variant="secondary">{docs.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-3">
                      {docs.map((doc) => (
                        <DocumentoItem
                          key={doc.id}
                          documento={doc}
                          onVisualizar={visualizarDocumento}
                          onBaixar={baixarDocumento}
                          showPrazo={incluirPrazos}
                          onVerOCR={incluirOCR ? setDocumentoOCRSelecionado : undefined}
                        />
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="space-y-3">
                {resultados.map((doc) => (
                  <DocumentoItem
                    key={doc.id}
                    documento={doc}
                    onVisualizar={visualizarDocumento}
                    onBaixar={baixarDocumento}
                    showPrazo={incluirPrazos}
                    onVerOCR={incluirOCR ? setDocumentoOCRSelecionado : undefined}
                  />
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Loading more indicator */}
      {isLoadingMore && (
        <Card className="p-4 text-center">
          <p className="text-sm text-muted-foreground">Carregando mais documentos...</p>
        </Card>
      )}

      {/* Estado vazio */}
      {!isLoading && resultados.length === 0 && (
        <Card className="p-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {termo || filtros.status || filtros.tipo_documento ? 'Nenhum documento encontrado' : 'Nenhum documento disponível'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {termo || filtros.status || filtros.tipo_documento 
              ? 'Tente ajustar os termos de busca ou os filtros' 
              : 'Os documentos dos credenciados aparecerão aqui automaticamente'}
          </p>
        </Card>
      )}

      {/* Modal de OCR */}
      {documentoOCRSelecionado && (
        <DadosOCRModal 
          open={!!documentoOCRSelecionado}
          onClose={() => setDocumentoOCRSelecionado(null)}
          documento={documentoOCRSelecionado}
        />
      )}
    </div>
  );
}
