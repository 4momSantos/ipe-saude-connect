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

export interface CidadeInfo {
  id: string;
  nome: string;
  uf: string;
  populacao: number;
  credenciados: number;
  densidade_geral: number;
  latitude: number;
  longitude: number;
  zoom: number;
}

export interface DensidadeResponse {
  cidade: CidadeInfo;
  densidades: DensidadeZona[];
}

export function useDensidadeCredenciados(cidadeId: string) {
  return useQuery({
    queryKey: ['densidade-credenciados', cidadeId],
    queryFn: async () => {
      console.log(`[DENSIDADE] Buscando dados para cidade ${cidadeId}`);
      
      const { data, error } = await supabase.functions.invoke('densidade-credenciados', {
        body: { cidade_id: cidadeId },
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
