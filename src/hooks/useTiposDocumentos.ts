import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTiposDocumentos() {
  return useQuery({
    queryKey: ['tipos-documentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inscricao_documentos')
        .select('tipo_documento')
        .not('tipo_documento', 'is', null);

      if (error) throw error;

      // Obter tipos únicos
      const tiposUnicos = [...new Set(data.map(d => d.tipo_documento))].sort();
      return tiposUnicos;
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });
}
