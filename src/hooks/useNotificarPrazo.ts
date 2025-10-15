// FASE 3: Hook para notificar prazo manualmente
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificarPrazoParams {
  prazo_id: string;
  mensagem_customizada?: string;
}

export const useNotificarPrazo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ prazo_id, mensagem_customizada }: NotificarPrazoParams) => {
      const { data, error } = await supabase.functions.invoke("notificar-prazo-manual", {
        body: { prazo_id, mensagem_customizada }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Notificação enviada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["prazos-vencimentos"] });
    },
    onError: (error: any) => {
      console.error("[useNotificarPrazo] Erro:", error);
      toast.error(error.message || "Erro ao enviar notificação");
    }
  });
};