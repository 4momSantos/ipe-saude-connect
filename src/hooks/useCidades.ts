import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Cidade {
  id: string;
  nome: string;
  uf: string;
  populacao_total: number;
  latitude_centro: number;
  longitude_centro: number;
  zoom_padrao: number;
  ativa: boolean;
}

export function useCidades() {
  return useQuery<Cidade[]>({
    queryKey: ['cidades-list'],
    queryFn: async () => {
      console.log('[CIDADES] Buscando cidades disponíveis');
      
      const { data, error } = await supabase
        .from('cidades' as any)
        .select('id, nome, uf, populacao_total, latitude_centro, longitude_centro, zoom_padrao, ativa')
        .eq('ativa', true)
        .order('nome');

      if (error) {
        console.error('[CIDADES] Erro ao buscar cidades:', error);
        throw error;
      }

      console.log('[CIDADES] Cidades carregadas:', data?.length);
      
      return (data || []) as unknown as Cidade[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutos
  });
}
