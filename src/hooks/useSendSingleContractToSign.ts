import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendContractResult {
  success: boolean;
  contrato_numero?: string;
  assignment_id?: string;
  signature_url?: string;
  email?: string;
  error?: string;
}

export const useSendSingleContractToSign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (contratoId: string) => {
      console.log('📤 Enviando contrato individual:', contratoId);
      
      const { data, error } = await supabase.functions.invoke(
        "reprocess-stuck-contracts",
        {
          body: { contrato_id: contratoId }
        }
      );

      if (error) throw error;
      
      // Validar resposta
      if (data.success === false) {
        throw new Error(data.error || 'Erro ao enviar contrato');
      }
      
      const result = data.details?.[0];
      if (!result) {
        throw new Error('Resposta inválida da função');
      }
      
      return {
        success: result.status === 'success',
        contrato_numero: result.contrato,
        assignment_id: result.assignment_id,
        signature_url: result.signature_url,
        email: result.email,
        error: result.error
      } as SendContractResult;
    },
    onSuccess: (data) => {
      console.log("✅ Contrato enviado:", data);
      
      if (!data.success) {
        toast.error(`❌ Falha ao enviar: ${data.error}`);
        return;
      }

      toast.success(
        `✅ Contrato enviado com sucesso!`,
        { 
          description: `Email de assinatura enviado para ${data.email}`,
          duration: 8000 
        }
      );
      
      // Invalidar caches relevantes
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['inscricoes'] });
    },
    onError: (error: Error) => {
      console.error("❌ Erro no envio individual:", error);
      toast.error(`Erro ao enviar contrato`, {
        description: error.message
      });
    },
  });
};
