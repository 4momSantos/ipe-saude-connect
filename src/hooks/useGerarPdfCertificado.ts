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
    onSuccess: async (data, variables) => {
      console.log('[GERAR_PDF] PDF gerado:', data);
      
      // Invalidar queries para forçar recarregamento
      await queryClient.invalidateQueries({ queryKey: ['consulta-publica'] });
      await queryClient.invalidateQueries({ queryKey: ['consulta-credenciado'] });
      
      // Fazer download automático se temos URL
      if (data?.url_pdf) {
        setTimeout(async () => {
          try {
            const response = await fetch(data.url_pdf);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `certificado-${variables.numeroCertificado}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            toast.success('Certificado atualizado e baixado!');
          } catch (error) {
            console.error('[AUTO_DOWNLOAD] Erro:', error);
            // Fallback: abrir em nova aba
            window.open(data.url_pdf, '_blank');
            toast.success('Abrindo certificado atualizado...');
          }
        }, 500);
      } else {
        toast.success(`PDF gerado com sucesso! Clique novamente para baixar.`);
      }
    },
    onError: (error: Error) => {
      console.error('[GERAR_PDF] Erro:', error);
      toast.error(`Erro ao gerar PDF: ${error.message}`);
    }
  });
};
