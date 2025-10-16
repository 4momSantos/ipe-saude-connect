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

  const agruparPorCredenciado = (docs: ResultadoBusca[]): CredenciadoAgrupado[] => {
    const grupos = docs.reduce((acc, doc) => {
      const chave = doc.credenciado_id;
      if (!acc[chave]) {
        acc[chave] = {
          credenciado_id: doc.credenciado_id,
          credenciado_nome: doc.credenciado_nome,
          credenciado_cpf: doc.credenciado_cpf,
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

  const buscar = async (termo: string, filtros: FiltrosBusca = {}, opcoes?: { incluirPrazos?: boolean; incluirOCR?: boolean }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('buscar-documentos', {
        body: { 
          termo: termo || null,
          ...filtros,
          incluir_prazos: opcoes?.incluirPrazos ?? false,
          incluir_ocr: opcoes?.incluirOCR ?? false
        }
      });

      if (error) throw error;

      const docs = data.data || [];
      const ordenacao = filtros.ordenacao || 'data_desc';
      const docsOrdenados = ordenarResultados(docs, ordenacao);
      
      setResultados(docsOrdenados);
      
      // Agrupar por credenciado se solicitado
      if (filtros.agrupar_por === 'credenciado') {
        setCredenciadosAgrupados(agruparPorCredenciado(docsOrdenados));
      } else {
        setCredenciadosAgrupados([]);
      }
      
      setTempoExecucao(data.meta?.tempo_ms || 0);
      
      const total = data.meta?.total || 0;
      
      // Só mostrar toast de sucesso se foi uma busca explícita (com termo)
      if (termo.trim()) {
        toast.success(`${total} documento${total !== 1 ? 's' : ''} encontrado${total !== 1 ? 's' : ''}`);
      }
    } catch (error: any) {
      console.error('Erro ao buscar documentos:', error);
      toast.error('Erro na busca: ' + error.message);
      setResultados([]);
      setCredenciadosAgrupados([]);
    } finally {
      setIsLoading(false);
    }
  };

  const limpar = () => {
    setResultados([]);
    setCredenciadosAgrupados([]);
    setTempoExecucao(0);
  };

  return { resultados, credenciadosAgrupados, isLoading, tempoExecucao, buscar, limpar };
}
