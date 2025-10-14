import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimularAssinaturaParams {
  contratoId: string;
  force?: boolean;
}

export const useSimularAssinatura = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contratoId, force = false }: SimularAssinaturaParams) => {
      const { data, error } = await supabase.functions.invoke(
        "simular-assinatura-contrato",
        {
          body: { contrato_id: contratoId, force }
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(
          `✅ Contrato ${data.contrato.numero_contrato} assinado`,
          {
            description: data.credenciado 
              ? `Credenciado: ${data.credenciado.nome}` 
              : 'Credenciado será criado automaticamente'
          }
        );
      } else {
        toast.error(`❌ ${data.message}`);
      }

      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["credenciados"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao simular assinatura: ${error.message}`);
    },
  });
};
