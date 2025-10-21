import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Calendar, AlertTriangle, CheckCircle, FileText, RefreshCw, Eye, Download } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StatusBadge } from './StatusBadge';
import { toast } from 'sonner';

type FiltroStatusPrazo = 'todos' | 'critico' | 'atencao' | 'ok' | 'vencido';

interface DocumentoAprovado {
  id: string;
  credenciado_id: string;
  credenciado_nome: string;
  credenciado_cpf: string;
  tipo_documento: string;
  numero_documento: string | null;
  arquivo_nome: string;
  url_arquivo: string;
  status: string;
  data_vencimento: string | null;
  dias_para_vencer: number | null;
  nivel_alerta: string;
  criado_em: string;
}

interface GrupoCredenciado {
  credenciado: {
    id: string;
    nome: string;
    cpf: string;
  };
  documentos: DocumentoAprovado[];
}

export function ControlePrazosAgrupado() {
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatusPrazo>('todos');

  // Buscar documentos aprovados com join de credenciados
  const { data: documentos, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['documentos-aprovados-agrupados'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documentos_credenciados')
        .select(`
          id,
          credenciado_id,
          tipo_documento,
          numero_documento,
          arquivo_nome,
          url_arquivo,
          status,
          data_vencimento,
          criado_em,
          credenciados!inner (
            id,
            nome,
            cpf
          )
        `)
        .eq('status', 'validado')
        .order('data_vencimento', { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Processar dados e calcular dias restantes
      return data.map((doc: any) => {
        const diasRestantes = doc.data_vencimento 
          ? Math.ceil((new Date(doc.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const nivelAlerta = calcularNivelAlerta(diasRestantes);

        return {
          id: doc.id,
          credenciado_id: doc.credenciados.id,
          credenciado_nome: doc.credenciados.nome,
          credenciado_cpf: doc.credenciados.cpf,
          tipo_documento: doc.tipo_documento,
          numero_documento: doc.numero_documento,
          arquivo_nome: doc.arquivo_nome,
          url_arquivo: doc.url_arquivo,
          status: doc.status,
          data_vencimento: doc.data_vencimento,
          dias_para_vencer: diasRestantes,
          nivel_alerta: nivelAlerta,
          criado_em: doc.criado_em
        } as DocumentoAprovado;
      });
    },
    refetchInterval: 60000 // Atualizar a cada minuto
  });

  // Agrupar documentos por credenciado
  const dadosAgrupados: GrupoCredenciado[] = useMemo(() => {
    if (!documentos) return [];

    const grupos = documentos.reduce((acc, doc) => {
      const credenciadoId = doc.credenciado_id;

      if (!acc[credenciadoId]) {
        acc[credenciadoId] = {
          credenciado: {
            id: doc.credenciado_id,
            nome: doc.credenciado_nome,
            cpf: doc.credenciado_cpf
          },
          documentos: []
        };
      }

      acc[credenciadoId].documentos.push(doc);
      return acc;
    }, {} as Record<string, GrupoCredenciado>);

    return Object.values(grupos).sort((a, b) => 
      a.credenciado.nome.localeCompare(b.credenciado.nome)
    );
  }, [documentos]);

  // Filtrar grupos
  const gruposFiltrados = useMemo(() => {
    if (filtroStatus === 'todos') return dadosAgrupados;

    return dadosAgrupados.map(grupo => ({
      ...grupo,
      documentos: grupo.documentos.filter(doc => {
        if (filtroStatus === 'vencido') return doc.dias_para_vencer !== null && doc.dias_para_vencer < 0;
        if (filtroStatus === 'critico') return doc.nivel_alerta === 'CRITICO' || doc.nivel_alerta === 'URGENTE';
        if (filtroStatus === 'atencao') return doc.nivel_alerta === 'ATENCAO';
        if (filtroStatus === 'ok') return doc.nivel_alerta === 'VALIDO';
        return true;
      })
    })).filter(grupo => grupo.documentos.length > 0);
  }, [dadosAgrupados, filtroStatus]);

  const handleViewDocument = async (documentoId: string, arquivoUrl: string, arquivoNome: string) => {
    try {
      const { data: urlData } = supabase.storage
        .from('inscricao-documentos')
        .getPublicUrl(arquivoUrl);

      if (urlData?.publicUrl) {
        window.open(urlData.publicUrl, '_blank');
      } else {
        toast.error('Erro ao visualizar documento');
      }
    } catch (error) {
      console.error('Erro ao visualizar:', error);
      toast.error('Erro ao visualizar documento');
    }
  };

  const handleDownloadDocument = async (arquivoUrl: string, arquivoNome: string) => {
    try {
      const { data: urlData } = supabase.storage
        .from('inscricao-documentos')
        .getPublicUrl(arquivoUrl);

      if (urlData?.publicUrl) {
        const response = await fetch(urlData.publicUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = arquivoNome || 'documento.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download iniciado!');
      } else {
        toast.error('Erro ao baixar documento');
      }
    } catch (error) {
      console.error('Erro ao baixar:', error);
      toast.error('Erro ao baixar documento');
    }
  };

  const totalDocumentos = documentos?.length || 0;
  const totalCredenciados = dadosAgrupados.length;
  const documentosCriticos = documentos?.filter(d => 
    d.nivel_alerta === 'CRITICO' || d.nivel_alerta === 'URGENTE' || (d.dias_para_vencer !== null && d.dias_para_vencer < 0)
  ).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Stats */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Controle de Prazos por Credenciado</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Documentos aprovados agrupados por profissional
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              disabled={isRefetching}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg dark:bg-blue-950/20">
              <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Documentos</p>
                <p className="text-2xl font-bold">{totalDocumentos}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg dark:bg-green-950/20">
              <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                <User className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credenciados</p>
                <p className="text-2xl font-bold">{totalCredenciados}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg dark:bg-red-950/20">
              <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Críticos/Vencidos</p>
                <p className="text-2xl font-bold">{documentosCriticos}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista Agrupada */}
      {gruposFiltrados.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum documento encontrado</p>
          </CardContent>
        </Card>
      ) : (
        gruposFiltrados.map((grupo) => (
          <Card key={grupo.credenciado.id} className="overflow-hidden">
            {/* Header do Credenciado */}
            <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{grupo.credenciado.nome}</h3>
                  <p className="text-sm opacity-90">
                    CPF: {grupo.credenciado.cpf} • {grupo.documentos.length} documento(s)
                  </p>
                </div>
              </div>
            </CardHeader>

            {/* Lista de Documentos */}
            <CardContent className="p-0">
              <div className="divide-y">
                {grupo.documentos.map((doc) => (
                  <div
                    key={doc.id}
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      doc.dias_para_vencer !== null && doc.dias_para_vencer < 0 ? 'bg-red-50 dark:bg-red-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Info do Documento */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border ${
                            doc.dias_para_vencer !== null && doc.dias_para_vencer < 0
                              ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400'
                              : doc.nivel_alerta === 'CRITICO' || doc.nivel_alerta === 'URGENTE'
                              ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {doc.dias_para_vencer !== null && doc.dias_para_vencer < 0 ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </div>

                          <div className="flex-1">
                            <h4 className="font-medium">{doc.tipo_documento}</h4>
                            {doc.numero_documento && (
                              <p className="text-sm text-muted-foreground">Nº {doc.numero_documento}</p>
                            )}
                          </div>
                        </div>

                        {/* Data de Vencimento e Status */}
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {doc.data_vencimento
                                ? formatDate(new Date(doc.data_vencimento), "dd/MM/yyyy", { locale: ptBR })
                                : 'Sem prazo definido'}
                            </span>
                          </div>

                          {doc.dias_para_vencer !== null && (
                            <StatusBadge
                              diasRestantes={doc.dias_para_vencer}
                              status={doc.nivel_alerta as any}
                              compact
                            />
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDocument(doc.id, doc.url_arquivo, doc.arquivo_nome)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadDocument(doc.url_arquivo, doc.arquivo_nome)}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Baixar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function calcularNivelAlerta(diasRestantes: number | null): string {
  if (diasRestantes === null) return 'SEM_PRAZO';
  if (diasRestantes < 0) return 'VENCIDO';
  if (diasRestantes <= 7) return 'URGENTE';
  if (diasRestantes <= 30) return 'CRITICO';
  if (diasRestantes <= 60) return 'ATENCAO';
  return 'VALIDO';
}
