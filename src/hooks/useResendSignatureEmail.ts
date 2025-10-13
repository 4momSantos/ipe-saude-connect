import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResendResult {
  contrato_id: string;
  success: boolean;
  email?: string;
  error?: string;
}

interface ResendReport {
  total_processed: number;
  total_success: number;
  total_errors: number;
  results: ResendResult[];
}

export const useResendSignatureEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contratoIds: string[]) => {
      const { data, error } = await supabase.functions.invoke<ResendReport>(
        "resend-signature-emails",
        {
          body: { contratoIds }
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        const { total_success, total_errors } = data;
        
        if (total_errors === 0) {
          toast.success(
            `✅ ${total_success} ${total_success === 1 ? 'e-mail reenviado' : 'e-mails reenviados'} com sucesso`
          );
        } else if (total_success === 0) {
          toast.error(`❌ Erro ao reenviar e-mails: ${total_errors} erros`);
        } else {
          toast.warning(
            `⚠️ ${total_success} e-mails reenviados, ${total_errors} ${total_errors === 1 ? 'erro' : 'erros'}`
          );
        }
      }

      // Invalidar queries para recarregar contratos
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reenviar e-mails: ${error.message}`);
    },
  });
};
