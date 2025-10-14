import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DensidadeZona {
  zona_id: string;
  zona: string;
  cidade: string;
  estado: string;
  populacao: number;
  area_km2: number;
  credenciados: number;
  densidade: number;
  cor: string;
  geometry: any;
}

export interface DensidadeResponse {
  cidade: string;
  estado: string;
  total_credenciados: number;
  total_populacao: number;
  densidade_geral: number;
  zonas: DensidadeZona[];
}

export function useDensidadeCredenciados(cidade: string = 'Recife', estado: string = 'PE') {
  return useQuery({
    queryKey: ['densidade-credenciados', cidade, estado],
    queryFn: async () => {
      console.log(`[DENSIDADE] Buscando dados para ${cidade}/${estado}`);
      
      const { data, error } = await supabase.functions.invoke('densidade-credenciados', {
        body: { cidade, estado },
      });

      if (error) {
        console.error('[DENSIDADE] Erro ao buscar densidade:', error);
        throw error;
      }

      console.log('[DENSIDADE] Dados recebidos:', data);
      
      return data as DensidadeResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
  });
}
