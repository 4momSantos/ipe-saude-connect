import { useState } from 'react';
import { Search, Filter, Download, Eye, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBuscarDocumentos, FiltrosBusca } from '@/hooks/useBuscarDocumentos';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function BuscaDocumentos() {
  const [termo, setTermo] = useState('');
  const [filtros, setFiltros] = useState<FiltrosBusca>({});
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  const { resultados, isLoading, tempoExecucao, buscar, limpar } = useBuscarDocumentos();

  const handleBuscar = () => {
    if (!termo.trim()) {
      toast.error('Digite um termo de busca');
      return;
    }
    buscar(termo, filtros);
  };

  const handleLimpar = () => {
    setTermo('');
    setFiltros({});
    limpar();
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
        window.open(data.signedUrl, '_blank');
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <Select 
              value={filtros.status} 
              onValueChange={(v) => setFiltros({...filtros, status: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="validado">Validado</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="Data Início"
              value={filtros.data_inicio || ''}
              onChange={(e) => setFiltros({...filtros, data_inicio: e.target.value})}
            />

            <Input
              type="date"
              placeholder="Data Fim"
              value={filtros.data_fim || ''}
              onChange={(e) => setFiltros({...filtros, data_fim: e.target.value})}
            />
          </div>
        )}
      </Card>

      {/* Resultados */}
      {resultados.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
            </h3>
            <span className="text-sm text-muted-foreground">
              {tempoExecucao}ms
            </span>
          </div>

          <div className="space-y-3">
            {resultados.map((doc) => (
              <Card key={doc.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium truncate">{doc.arquivo_nome}</h4>
                      <Badge variant={getStatusBadgeVariant(doc.status)}>
                        {doc.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {doc.tipo_documento} • {doc.credenciado_nome} {doc.credenciado_cpf && `(CPF: ${doc.credenciado_cpf})`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {doc.snippet && (
                      <p className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded mt-2 line-clamp-2">
                        ...{doc.snippet}...
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => visualizarDocumento(doc.arquivo_url, doc.arquivo_nome)}
                      title="Visualizar documento"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => baixarDocumento(doc.arquivo_url, doc.arquivo_nome)}
                      title="Baixar documento"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Estado vazio */}
      {!isLoading && resultados.length === 0 && termo && (
        <Card className="p-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum documento encontrado</h3>
          <p className="text-sm text-muted-foreground">
            Tente ajustar os termos de busca ou os filtros
          </p>
        </Card>
      )}
    </div>
  );
}
