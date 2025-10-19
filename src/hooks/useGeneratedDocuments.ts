import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGeneratedDocuments(credenciadoId?: string) {
  return useQuery({
    queryKey: ['generated-documents', credenciadoId],
    queryFn: async () => {
      let query = supabase
        .from('generated_documents')
        .select(`
          *,
          template:document_templates(nome, tipo_documento),
          signature_request:signature_requests(status)
        `)
        .order('created_at', { ascending: false });

      if (credenciadoId) {
        query = query.eq('credenciado_id', credenciadoId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!credenciadoId
  });
}
