import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GerarPdfParams {
  certificadoId: string;
  numeroCertificado: string;
}

export const useGerarPdfCertificado = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ certificadoId }: GerarPdfParams) => {
      const { data, error } = await supabase.functions.invoke('gerar-certificado-regularidade', {
        body: { certificadoId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(`PDF gerado com sucesso para o certificado ${variables.numeroCertificado}`);
      // Invalidar queries para forçar recarregamento
      queryClient.invalidateQueries({ queryKey: ['consulta-publica'] });
      queryClient.invalidateQueries({ queryKey: ['consulta-credenciado'] });
    },
    onError: (error: Error) => {
      console.error('[GERAR_PDF] Erro:', error);
      toast.error(`Erro ao gerar PDF: ${error.message}`);
    }
  });
};
