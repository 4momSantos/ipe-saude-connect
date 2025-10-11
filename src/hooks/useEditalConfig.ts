import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useEditalConfig(editalId: string | undefined) {
  return useQuery({
    queryKey: ['edital-config', editalId],
    queryFn: async () => {
      if (!editalId) return null;
      
      const { data, error } = await supabase
        .from('editais')
        .select('id, titulo, max_especialidades')
        .eq('id', editalId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!editalId,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });
}
