import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReprocessarParams {
  inscricaoId: string;
}

export function useReprocessarCredenciado() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ inscricaoId }: ReprocessarParams) => {
      const { data, error } = await supabase.functions.invoke("reprocessar-credenciado", {
        body: { inscricao_id: inscricaoId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["credenciados"] });
      toast.success("Credenciado reprocessado com sucesso!", {
        description: `ID: ${data.credenciado_id}`
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao reprocessar credenciado:", error);
      toast.error("Erro ao reprocessar credenciado", {
        description: error.message
      });
    }
  });

  return {
    reprocessar: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError
  };
}
