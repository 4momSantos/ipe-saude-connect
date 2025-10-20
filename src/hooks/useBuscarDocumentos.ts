import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type OrdenacaoTipo = 'relevancia' | 'data_desc' | 'data_asc' | 'nome_asc' | 'tipo_asc';

export interface FiltrosBusca {
  status?: string;
  tipo_documento?: string;
  credenciado_id?: string;
  data_inicio?: string;
  data_fim?: string;
  ordenacao?: OrdenacaoTipo;
  agrupar_por?: 'tipo' | 'nenhum' | 'credenciado';
  status_credenciado?: string;
  apenas_habilitados?: boolean;
  apenas_com_numero?: boolean;
  incluir_nao_credenciados?: boolean;
}

export interface ResultadoBusca {
  id: string;
  inscricao_id: string;
  tipo_documento: string;
  arquivo_nome: string;
  arquivo_url: string;
  status: string;
  created_at: string;
  credenciado_nome: string;
  credenciado_cpf: string;
  credenciado_id: string;
  credenciado_status: string;
  credenciado_numero: string;
  data_habilitacao: string | null;
  is_credenciado: boolean;
  relevancia: number;
  snippet: string;
  // Campos de prazo
  data_vencimento?: string;
  dias_para_vencer?: number;
  status_prazo?: string;
  // Campos de OCR
  ocr_resultado?: Record<string, any>;
  ocr_processado?: boolean;
  ocr_confidence?: number;
}

export interface CredenciadoAgrupado {
  credenciado_id: string;
  credenciado_nome: string;
  credenciado_cpf: string;
  total_documentos: number;
  documentos: ResultadoBusca[];
}

export function useBuscarDocumentos() {
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [credenciadosAgrupados, setCredenciadosAgrupados] = useState<CredenciadoAgrupado[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [tempoExecucao, setTempoExecucao] = useState<number>(0);
  const LIMIT = 50;

  const ordenarResultados = (docs: ResultadoBusca[], tipo: OrdenacaoTipo): ResultadoBusca[] => {
    const sorted = [...docs];
    switch (tipo) {
      case 'data_desc':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'data_asc':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'nome_asc':
        return sorted.sort((a, b) => a.arquivo_nome.localeCompare(b.arquivo_nome));
      case 'tipo_asc':
        return sorted.sort((a, b) => a.tipo_documento.localeCompare(b.tipo_documento));
      case 'relevancia':
      default:
        return sorted.sort((a, b) => b.relevancia - a.relevancia);
    }
  };

  const agruparPorCredenciado = (docs: ResultadoBusca[]): CredenciadoAgrupado[] => {
    const grupos = docs.reduce((acc, doc) => {
      // Usar credenciado_id como chave única, com fallback
      const chave = doc.credenciado_id || `fallback_${doc.credenciado_cpf || 'sem-cpf'}_${doc.credenciado_nome}`;
      if (!acc[chave]) {
        acc[chave] = {
          credenciado_id: doc.credenciado_id || '',
          credenciado_nome: doc.credenciado_nome || 'Nome não disponível',
          credenciado_cpf: doc.credenciado_cpf || '',
          total_documentos: 0,
          documentos: []
        };
      }
      acc[chave].documentos.push(doc);
      acc[chave].total_documentos++;
      return acc;
    }, {} as Record<string, CredenciadoAgrupado>);

    return Object.values(grupos).sort((a, b) => 
      a.credenciado_nome.localeCompare(b.credenciado_nome)
    );
  };

  const buscar = async (
    termo: string, 
    filtros: FiltrosBusca = {}, 
    opcoes?: {
      incluirPrazos?: boolean;
      incluirOCR?: boolean;
    },
    loadMore = false
  ) => {
    if (loadMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
      setOffset(0);
      setTempoExecucao(0);
    }

    try {
      const currentOffset = loadMore ? offset : 0;
      
      console.log('[useBuscarDocumentos] Chamando edge function com:', {
        termo: termo || null,
        filtros,
        opcoes,
        currentOffset
      });
      
      const { data, error } = await supabase.functions.invoke('buscar-documentos', {
        body: { 
          termo: termo || null,
          ...filtros,
          incluir_prazos: opcoes?.incluirPrazos ?? false,
          incluir_ocr: opcoes?.incluirOCR ?? false,
          status_credenciado: filtros.status_credenciado || null,
          apenas_habilitados: filtros.apenas_habilitados ?? null,
          apenas_com_numero: filtros.apenas_com_numero ?? null,
          incluir_nao_credenciados: filtros.incluir_nao_credenciados ?? false,
          limit: LIMIT,
          offset: currentOffset
        }
      });

      console.log('[useBuscarDocumentos] Resposta recebida:', { data, error });

      if (error) throw error;

      const novosResultados = data.data || [];
      console.log('[useBuscarDocumentos] Novos resultados:', novosResultados.length);
      
      const ordenacao = filtros.ordenacao || 'data_desc';
      const docsOrdenados = ordenarResultados(novosResultados, ordenacao);
      
      if (loadMore) {
        const todosResultados = [...resultados, ...docsOrdenados];
        setResultados(todosResultados);
        
        if (filtros.agrupar_por === 'credenciado') {
          setCredenciadosAgrupados(agruparPorCredenciado(todosResultados));
        }
      } else {
        console.log('[useBuscarDocumentos] Setando resultados:', docsOrdenados.length);
        setResultados(docsOrdenados);
        
        if (filtros.agrupar_por === 'credenciado') {
          const agrupados = agruparPorCredenciado(docsOrdenados);
          console.log('[useBuscarDocumentos] Credenciados agrupados:', agrupados.length);
          setCredenciadosAgrupados(agrupados);
        } else {
          setCredenciadosAgrupados([]);
        }
      }
      
      setHasMore(data.meta?.has_more ?? false);
      setOffset(currentOffset + LIMIT);
      setTempoExecucao(data.meta?.tempo_ms || 0);
      
      const total = data.meta?.total || 0;
      
      if (!loadMore && termo.trim()) {
        toast.success(`${total} documento${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('[useBuscarDocumentos] Erro ao buscar documentos:', error);
      toast.error('Erro na busca: ' + error.message);
      if (!loadMore) {
        setResultados([]);
        setCredenciadosAgrupados([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const carregarMais = (termo: string, filtros: FiltrosBusca, opcoes?: any) => {
    if (!isLoadingMore && hasMore) {
      buscar(termo, filtros, opcoes, true);
    }
  };

  const limpar = () => {
    setResultados([]);
    setCredenciadosAgrupados([]);
    setOffset(0);
    setHasMore(true);
    setTempoExecucao(0);
  };

  return {
    resultados,
    credenciadosAgrupados,
    isLoading,
    isLoadingMore,
    hasMore,
    tempoExecucao,
    buscar,
    carregarMais,
    limpar
  };
}
