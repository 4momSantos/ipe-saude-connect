import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEstatisticasCredenciado(credenciadoId: string) {
  return useQuery({
    queryKey: ['estatisticas-credenciado', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estatisticas_credenciado')
        .select('*')
        .eq('credenciado_id', credenciadoId)
        .maybeSingle();

      if (error) throw error;

      // Se não existe estatísticas ainda, retornar valores padrão
      if (!data) {
        return {
          credenciado_id: credenciadoId,
          nota_media_publica: null,
          total_avaliacoes_publicas: 0,
          distribuicao_notas: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          nota_media_interna: null,
          total_avaliacoes_internas: 0,
          performance_score: 0,
          taxa_satisfacao: null,
          tempo_medio_atendimento: null,
          indice_resolucao: null,
          ranking_especialidade: null,
          ranking_regiao: null,
          badges: [],
          atualizado_em: null,
        };
      }

      return data;
    },
    enabled: !!credenciadoId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useTopCredenciados(limite: number = 10) {
  return useQuery({
    queryKey: ['top-credenciados', limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('estatisticas_credenciado')
        .select(`
          *,
          credenciados(
            id,
            nome,
            foto,
            especialidade_principal
          )
        `)
        .gte('total_avaliacoes_publicas', 5)
        .order('nota_media_publica', { ascending: false })
        .limit(limite);

      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
}
