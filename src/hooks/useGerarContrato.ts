import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GerarContratoParams {
  inscricaoId: string;
  templateId?: string;
}

export function useGerarContrato() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ inscricaoId, templateId }: GerarContratoParams) => {
      // Chamar edge function para gerar contrato
      const { data, error } = await supabase.functions.invoke("gerar-contrato-assinatura", {
        body: { 
          inscricao_id: inscricaoId,
          template_id: templateId
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      toast.success("Contrato enviado para assinatura!", {
        description: data.status === 'processing' 
          ? "Aguardando processamento do Assinafy. O email será enviado em breve."
          : `Número: ${data.numero_contrato || 'Em processamento'}`
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao gerar contrato:", error);
      
      // Detectar erro de timeout do Assinafy
      const isTimeout = error.message.includes('não ficou pronto') || 
                       error.message.includes('timeout') ||
                       error.message.includes('não está pronto');
      
      if (isTimeout) {
        toast.error("⏳ Documento está sendo processado pelo Assinafy", {
          description: "Aguarde 1-2 minutos e clique em '🔄 Reprocessar' no contrato para concluir o envio.",
          duration: 10000
        });
      } else {
        toast.error("Erro ao gerar contrato: " + error.message);
      }
    }
  });

  return {
    gerar: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError
  };
}
