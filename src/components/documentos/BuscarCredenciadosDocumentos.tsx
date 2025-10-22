import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Search, User, FileText, AlertCircle,
  Download, ExternalLink, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertTriangle, Eye, Plus, RefreshCw
} from 'lucide-react';
import { useBuscarCredenciadosCompleto, DocumentoComMatch } from '@/hooks/useBuscarCredenciadosCompleto';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export function BuscarCredenciadosDocumentos() {
  const [termoBusca, setTermoBusca] = useState('');
  const [termoAtual, setTermoAtual] = useState(' '); // Inicia com espaço para buscar todos automaticamente
  const [statusFiltro, setStatusFiltro] = useState<string>(''); // Inicia com "Todos" os status
  const [apenasComDocumentos, setApenasComDocumentos] = useState(false);
  const [apenasVencidos, setApenasVencidos] = useState(false);
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: credenciados, isLoading } = useBuscarCredenciadosCompleto({
    termoBusca: termoAtual,
    status: statusFiltro || undefined,
    apenasComDocumentos,
    apenasVencidos
  });

  // ✅ Debounce para invalidações realtime
  const debouncedInvalidate = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setIsRefreshing(true);
          queryClient.invalidateQueries({ 
            queryKey: ['buscar-credenciados-completo'] 
          });
          setTimeout(() => setIsRefreshing(false), 1000);
          toast.info('Dados atualizados automaticamente');
        }, 1000);
      };
    },
    [queryClient]
  );

  // ✅ Subscription realtime para credenciados e documentos (sempre ativo)
  useEffect(() => {
    const channel = supabase
      .channel('busca-credenciados-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'credenciados'
        },
        (payload) => {
          console.log('Credenciado atualizado:', payload);
          debouncedInvalidate();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos_credenciados'
        },
        (payload) => {
          console.log('Documento atualizado:', payload);
          debouncedInvalidate();
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [debouncedInvalidate]); // Remove termoAtual - subscription sempre ativo

  const toggleExpandido = (id: string) => {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBuscar = () => {
    setTermoAtual(termoBusca);
  };

  const handleLimpar = () => {
    setTermoBusca('');
    setTermoAtual('');
  };

  const getBadgeVariant = (dias: number | null): "default" | "secondary" | "destructive" => {
    if (dias === null) return 'secondary';
    if (dias < 0) return 'destructive';
    if (dias <= 30) return 'secondary';
    return 'default';
  };

  // ✅ Função para destacar termo de busca
  const highlightText = (text: string | null, termo: string) => {
    if (!text || !termo) return text;
    const regex = new RegExp(`(${termo})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-900 px-1 rounded font-semibold">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const visualizarDocumento = async (arquivoUrl: string) => {
    try {
      const path = arquivoUrl.replace('inscricao-documentos/', '');
      
      const { data, error } = await supabase.storage
        .from('inscricao-documentos')
        .createSignedUrl(path, 3600);
      
      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Erro ao visualizar documento:', error);
      toast.error('Erro ao abrir documento');
    }
  };

  const baixarDocumento = async (arquivoUrl: string, nome: string) => {
    try {
      const path = arquivoUrl.replace('inscricao-documentos/', '');
      
      const { data, error } = await supabase.storage
        .from('inscricao-documentos')
        .download(path);
      
      if (error) throw error;
      
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
      toast.error('Erro ao baixar documento');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header de Busca */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Credenciados e Documentos
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Ao vivo
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Buscar por nome, CPF, CNPJ, tipo de doc, número, arquivo, observações..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
              className="flex-1"
            />
            <Button onClick={handleBuscar} disabled={isLoading}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
            {termoAtual && (
              <Button variant="ghost" onClick={handleLimpar}>
                Limpar
              </Button>
            )}
          </div>

          {termoAtual && (
            <p className="text-xs text-muted-foreground">
              💡 Buscando em: nome, CPF, CNPJ, email, tipo de documento, número do documento, nome do arquivo, observações, descrição e conteúdo OCR
            </p>
          )}

          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <Label htmlFor="status-filtro" className="text-sm">Status:</Label>
              <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                <SelectTrigger id="status-filtro" className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                  <SelectItem value="Suspenso">Suspenso</SelectItem>
                  <SelectItem value="">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="com-docs"
                checked={apenasComDocumentos}
                onCheckedChange={(checked) => setApenasComDocumentos(checked as boolean)}
              />
              <Label htmlFor="com-docs" className="cursor-pointer">
                Apenas com documentos
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="vencidos"
                checked={apenasVencidos}
                onCheckedChange={(checked) => setApenasVencidos(checked as boolean)}
              />
              <Label htmlFor="vencidos" className="cursor-pointer">
                Apenas com docs vencidos
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {isLoading && (
        <Card className="p-8 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5 animate-spin" />
            <span>Carregando credenciados...</span>
          </div>
        </Card>
      )}

      {/* Resultados */}
      {!isLoading && credenciados && credenciados.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {credenciados.length} credenciado{credenciados.length !== 1 ? 's' : ''} encontrado{credenciados.length !== 1 ? 's' : ''}
              {termoAtual && ` para "${termoAtual}"`}
            </div>
            
            {isRefreshing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Atualizando resultados...
              </div>
            )}
          </div>

          {credenciados.map((credenciado) => (
            <Card key={credenciado.credenciado_id}>
              <CardContent className="pt-6">
                <Collapsible
                  open={expandidos[credenciado.credenciado_id]}
                  onOpenChange={() => toggleExpandido(credenciado.credenciado_id)}
                >
                  {/* Header do Credenciado */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold text-lg">
                          {highlightText(credenciado.credenciado_nome, termoAtual)}
                        </h3>
                        <Badge variant="outline">{credenciado.credenciado_status}</Badge>
                      </div>

                      <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
                        {credenciado.credenciado_cpf && (
                          <span>CPF: {highlightText(credenciado.credenciado_cpf, termoAtual)}</span>
                        )}
                        {credenciado.credenciado_cnpj && (
                          <span>CNPJ: {highlightText(credenciado.credenciado_cnpj, termoAtual)}</span>
                        )}
                        {credenciado.credenciado_email && (
                          <span>Email: {highlightText(credenciado.credenciado_email, termoAtual)}</span>
                        )}
                        {credenciado.credenciado_numero && (
                          <span>Nº {credenciado.credenciado_numero}</span>
                        )}
                      </div>

                      {/* Resumo de Documentos */}
                      <div className="flex gap-2 flex-wrap">
                        {credenciado.total_documentos === 0 ? (
                          <>
                            <Badge variant="outline" className="border-orange-500 text-orange-600">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Sem documentos cadastrados
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/credenciados/${credenciado.credenciado_id}`)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Cadastrar documentos
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary">
                              {credenciado.total_documentos} documento{credenciado.total_documentos !== 1 ? 's' : ''}
                            </Badge>
                            
                            {credenciado.documentos_vencidos > 0 && (
                              <Badge variant="destructive">
                                {credenciado.documentos_vencidos} vencido{credenciado.documentos_vencidos !== 1 ? 's' : ''}
                              </Badge>
                            )}
                            
                            {credenciado.documentos_vencendo > 0 && (
                              <Badge className="bg-[hsl(var(--orange-warning))] text-white">
                                {credenciado.documentos_vencendo} vencendo em breve
                              </Badge>
                            )}

                            {credenciado.proximo_vencimento && (
                              <Badge variant="outline">
                                Próximo: {format(new Date(credenciado.proximo_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Botão Expandir */}
                    {credenciado.total_documentos > 0 && (
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          {expandidos[credenciado.credenciado_id] ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    )}
                  </div>

                  {/* Lista de Documentos (Colapsável) */}
                  <CollapsibleContent className="pt-4">
                    {credenciado.documentos && credenciado.documentos.length > 0 ? (
                      <div className="space-y-2 border-t pt-4">
                        {credenciado.documentos.map((doc: DocumentoComMatch) => {
                          const diasVencer = doc.dias_para_vencer;
                          const vencido = diasVencer !== null && diasVencer < 0;
                          const vencendoEmBreve = diasVencer !== null && diasVencer >= 0 && diasVencer <= 30;

                          return (
                            <div
                              key={doc.id}
                              className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                                doc.match_termo
                                  ? 'bg-yellow-50 dark:bg-yellow-950 border-2 border-yellow-400 dark:border-yellow-600'
                                  : vencido 
                                  ? 'bg-destructive/10 border border-destructive/30'
                                  : vencendoEmBreve
                                  ? 'bg-[hsl(var(--orange-warning))]/10 border border-[hsl(var(--orange-warning))]/30'
                                  : 'bg-muted/50 border border-border'
                              }`}
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  
                                  {/* ✅ Ícone de match */}
                                  {doc.match_termo && (
                                    <CheckCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                  )}
                                  
                                  <span className="font-medium">
                                    {highlightText(doc.tipo_documento, termoAtual)}
                                  </span>
                                  
                                  {doc.numero_documento && (
                                    <Badge variant="outline">
                                      Nº {highlightText(doc.numero_documento, termoAtual)}
                                    </Badge>
                                  )}

                                  {doc.ocr_processado && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Eye className="w-3 h-3 mr-1" />
                                      OCR
                                    </Badge>
                                  )}
                                  
                                  {/* Badge de vencimento */}
                                  <Badge variant={getBadgeVariant(diasVencer)}>
                                    {diasVencer !== null ? (
                                      diasVencer < 0 ? (
                                        <>
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          Vencido há {Math.abs(diasVencer)} dias
                                        </>
                                      ) : diasVencer <= 30 ? (
                                        <>
                                          <Clock className="w-3 h-3 mr-1" />
                                          Vence em {diasVencer} dias
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-3 h-3 mr-1" />
                                          Vigente
                                        </>
                                      )
                                    ) : (
                                      'Sem vencimento'
                                    )}
                                  </Badge>
                                </div>

                                <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                  {/* Nome do arquivo com highlight */}
                                  <div className="truncate max-w-2xl">
                                    📎 {highlightText(doc.arquivo_nome, termoAtual)}
                                  </div>
                                  
                                  {/* Datas */}
                                  {doc.data_vencimento && (
                                    <span className="block">
                                      Vencimento: {format(new Date(doc.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })}
                                    </span>
                                  )}
                                  
                                  {/* Observações com highlight */}
                                  {doc.observacao && (
                                    <div className="text-xs italic mt-1">
                                      💬 {highlightText(doc.observacao, termoAtual)}
                                    </div>
                                  )}

                                  {/* Descrição com highlight */}
                                  {doc.descricao && (
                                    <div className="text-xs mt-1">
                                      📝 {highlightText(doc.descricao, termoAtual)}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => visualizarDocumento(doc.url_arquivo)}
                                  title="Visualizar documento"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => baixarDocumento(doc.url_arquivo, doc.arquivo_nome)}
                                  title="Baixar documento"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground border-t">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Nenhum documento cadastrado
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Estado vazio */}
      {!isLoading && (!credenciados || credenciados.length === 0) && (
        <Card className="p-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">
            {termoAtual ? 'Nenhum resultado encontrado' : 'Digite algo para buscar'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {termoAtual 
              ? `Nenhum credenciado ou documento corresponde a "${termoAtual}"`
              : 'Use a barra de busca para encontrar credenciados por nome, documentos por tipo, número, arquivo ou até mesmo conteúdo OCR'
            }
          </p>
        </Card>
      )}
    </div>
  );
}
