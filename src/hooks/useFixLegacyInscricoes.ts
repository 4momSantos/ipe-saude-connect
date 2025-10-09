import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useFixLegacyInscricoes() {
  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("fix-legacy-inscricoes", {
        body: {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Processamento iniciado!", {
        description: `${data.editais_corrigidos} editais corrigidos. ${data.inscricoes_encontradas} inscrições sendo processadas em background.`,
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao processar inscrições:", error);
      toast.error("Erro ao processar inscrições antigas", {
        description: error.message,
      });
    },
  });

  return {
    fixInscricoes: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
