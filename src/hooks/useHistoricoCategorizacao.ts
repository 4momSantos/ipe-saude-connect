import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoricoCategorizacao {
  id: string;
  data_alteracao: string;
  categoria_anterior: string | null;
  categoria_anterior_codigo: string | null;
  categoria_nova: string | null;
  categoria_nova_codigo: string | null;
  tipo_operacao: 'inclusao' | 'alteracao' | 'remocao';
  principal_anterior: boolean | null;
  principal_nova: boolean | null;
  usuario_nome: string | null;
  justificativa: string | null;
}

export interface StatsCategorizacao {
  total_alteracoes: number;
  total_inclusoes: number;
  total_remocoes: number;
  total_alteracoes_principal: number;
  ultima_alteracao: string | null;
  categorias_ja_vinculadas: string[];
}

export function useHistoricoCategorizacao(credenciadoId: string) {
  const { data: historico, isLoading, error } = useQuery({
    queryKey: ['historico-categorizacao', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_extrato_categorizacao' as any, {
          p_credenciado_id: credenciadoId,
        });

      if (error) throw error;
      return (data as any) as HistoricoCategorizacao[];
    },
    enabled: !!credenciadoId,
  });

  const { data: stats } = useQuery({
    queryKey: ['stats-categorizacao', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_stats_categorizacao' as any, {
          p_credenciado_id: credenciadoId,
        });

      if (error) throw error;
      return (data as any)?.[0] as StatsCategorizacao | undefined;
    },
    enabled: !!credenciadoId,
  });

  return {
    historico,
    stats,
    isLoading,
    error,
  };
}
