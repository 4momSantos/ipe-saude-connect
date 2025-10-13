import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RegenerateContractParams {
  contrato_id: string;
}

export const useRegenerateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contrato_id }: RegenerateContractParams) => {
      const { data, error } = await supabase.functions.invoke(
        "regenerate-failed-contract",
        {
          body: { contrato_id }
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(
          `✅ Contrato regenerado com sucesso`,
          {
            description: `Antigo: ${data.contrato_antigo_numero} → Novo: ${data.contrato_novo?.numero_contrato || 'gerado'}`
          }
        );
      } else {
        toast.error(`❌ Erro ao regenerar contrato`);
      }

      // Invalidar queries para recarregar contratos
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao regenerar contrato: ${error.message}`);
    },
  });
};
