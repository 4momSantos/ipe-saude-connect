import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GerarCertificadoParams {
  credenciadoId: string;
  force_new?: boolean;
}

export function useGerarCertificado() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ credenciadoId, force_new = false }: GerarCertificadoParams) => {
      console.log('[useGerarCertificado] Iniciando geração de certificado para:', credenciadoId, 'force_new:', force_new);

      const { data: certificadoData, error: functionError } = await supabase.functions.invoke(
        "gerar-certificado",
        {
          body: { credenciadoId, force_new }
        }
      );

      // 🔍 LOG DETALHADO DA RESPOSTA
      console.log('[useGerarCertificado] Resposta da edge function:', {
        data: certificadoData,
        error: functionError
      });

      if (functionError) {
        console.error('[useGerarCertificado] Erro da edge function:', functionError);
        throw functionError;
      }
      
      if (!certificadoData?.success) {
        console.error('[useGerarCertificado] Resposta sem success:', certificadoData);
        throw new Error(certificadoData?.message || certificadoData?.error || 'Erro ao gerar certificado');
      }

      console.log('[useGerarCertificado] Certificado gerado com sucesso!');

      return {
        numeroCertificado: certificadoData.certificado.numero_certificado,
        documentoUrl: certificadoData.certificado.documento_url,
        verificationUrl: certificadoData.certificado.verificationUrl
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["certificados"] });
      toast.success("Certificado gerado com sucesso!", {
        description: `Número: ${data.numeroCertificado}`
      });
    },
    onError: (error: Error) => {
      console.error("[useGerarCertificado] Erro:", error);
      toast.error("Erro ao gerar certificado", {
        description: error.message
      });
    }
  });

  return {
    gerar: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError
  };
}
