// FASE 3: Hook para prorrogar prazo
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProrrogarPrazoParams {
  prazo_id: string;
  nova_data: string;
  justificativa: string;
}

export const useProrrogarPrazo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prazo_id, nova_data, justificativa }: ProrrogarPrazoParams) => {
      const { data, error } = await supabase.functions.invoke("prorrogar-prazo", {
        body: { prazo_id, nova_data, justificativa }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Prazo prorrogado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["prazos-vencimentos"] });
      queryClient.invalidateQueries({ queryKey: ["prazos-vencidos-count"] });
    },
    onError: (error: any) => {
      console.error("[useProrrogarPrazo] Erro:", error);
      toast.error(error.message || "Erro ao prorrogar prazo");
    }
  });
};