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
  agrupar_por?: 'tipo' | 'nenhum';
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
  relevancia: number;
  snippet: string;
}

export function useBuscarDocumentos() {
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tempoExecucao, setTempoExecucao] = useState<number>(0);

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

  const buscar = async (termo: string, filtros: FiltrosBusca = {}) => {
    if (!termo.trim()) {
      toast.error('Digite um termo de busca');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('buscar-documentos', {
        body: { termo, ...filtros }
      });

      if (error) throw error;

      const docs = data.data || [];
      const ordenacao = filtros.ordenacao || 'relevancia';
      const docsOrdenados = ordenarResultados(docs, ordenacao);
      
      setResultados(docsOrdenados);
      setTempoExecucao(data.meta?.tempo_ms || 0);
      
      const total = data.meta?.total || 0;
      toast.success(`${total} documento${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error('Erro ao buscar documentos:', error);
      toast.error('Erro na busca: ' + error.message);
      setResultados([]);
    } finally {
      setIsLoading(false);
    }
  };

  const limpar = () => {
    setResultados([]);
    setTempoExecucao(0);
  };

  return { resultados, isLoading, tempoExecucao, buscar, limpar };
}
