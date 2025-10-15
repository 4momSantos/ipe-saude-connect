import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FiltrosBusca {
  status?: string;
  tipo_documento?: string;
  credenciado_id?: string;
  data_inicio?: string;
  data_fim?: string;
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

      setResultados(data.data || []);
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
