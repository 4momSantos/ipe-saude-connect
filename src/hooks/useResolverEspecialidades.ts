import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para resolver UUIDs de especialidades em nomes legíveis
 * Utiliza cache para otimizar performance
 */
export function useResolverEspecialidades(especialidadesIds: string[]) {
  return useQuery({
    queryKey: ['especialidades-nomes', especialidadesIds],
    queryFn: async () => {
      if (!Array.isArray(especialidadesIds) || especialidadesIds.length === 0) {
        return [];
      }
      
      console.log('[RESOLVER] Buscando especialidades para IDs:', especialidadesIds);
      
      const { data, error } = await supabase
        .from('especialidades_medicas')
        .select('id, nome')
        .in('id', especialidadesIds);
      
      if (error) {
        console.error('[RESOLVER] Erro ao buscar especialidades:', error);
        throw error;
      }
      
      const nomes = data?.map(e => e.nome) || [];
      console.log('[RESOLVER] Nomes encontrados:', nomes);
      return nomes;
    },
    enabled: Array.isArray(especialidadesIds) && especialidadesIds.length > 0,
    staleTime: 1000 * 60 * 60, // Cache por 1 hora
  });
}
