import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReprocessResult {
  contrato_id: string;
  inscricao_id: string;
  signature_request_id?: string;
  success: boolean;
  error?: string;
}

interface ReprocessReport {
  total_processed: number;
  total_success: number;
  total_errors: number;
  results: ReprocessResult[];
}

export const useReprocessSignatures = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<ReprocessReport>(
        "reprocess-signature-requests"
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        const { total_success, total_errors } = data;
        
        if (total_errors === 0) {
          toast.success(
            `✅ ${total_success} ${total_success === 1 ? 'assinatura reprocessada' : 'assinaturas reprocessadas'} com sucesso`
          );
        } else if (total_success === 0) {
          toast.error(`❌ Erro ao reprocessar assinaturas: ${total_errors} erros`);
        } else {
          toast.warning(
            `⚠️ ${total_success} assinaturas reprocessadas, ${total_errors} ${total_errors === 1 ? 'erro' : 'erros'}`
          );
        }
      }

      // Invalidar queries para recarregar contratos
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reprocessar assinaturas: ${error.message}`);
    },
  });
};
