import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useEmitirCertificadoRegularidade() {
  return useMutation({
    mutationFn: async ({ credenciadoId }: { credenciadoId: string }) => {
      const { data, error } = await supabase.functions.invoke('gerar-certificado-regularidade', {
        body: { credenciadoId }
      });

      if (error) throw error;
      
      // Download do PDF
      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      }
      
      return data;
    },
    onSuccess: () => {
      toast.success('Certificado de regularidade emitido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao emitir certificado', { description: error.message });
    }
  });
}
