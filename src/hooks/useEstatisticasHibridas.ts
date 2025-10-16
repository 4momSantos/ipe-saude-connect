import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface EstatisticasHibridas {
  nota_media_publica: number | null;
  total_avaliacoes_publicas: number;
  nota_media_interna: number | null;
  total_avaliacoes_internas: number;
  performance_score: number | null;
  criterios_destaque: Array<{ nome: string; media: number }> | null;
  pontos_fortes: string[];
  pontos_fracos: string[];
  badges: string[];
}

export function useEstatisticasHibridas(credenciadoId: string) {
  return useQuery<EstatisticasHibridas>({
    queryKey: ['estatisticas-hibridas', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calcular_estatisticas_hibridas', {
        p_credenciado_id: credenciadoId
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          nota_media_publica: null,
          total_avaliacoes_publicas: 0,
          nota_media_interna: null,
          total_avaliacoes_internas: 0,
          performance_score: null,
          criterios_destaque: null,
          pontos_fortes: [],
          pontos_fracos: [],
          badges: []
        };
      }

      return data[0] as EstatisticasHibridas;
    },
    enabled: !!credenciadoId,
    staleTime: 5 * 60 * 1000 // 5 minutos
  });
}
