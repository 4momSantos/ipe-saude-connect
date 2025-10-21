import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCorrigirSolicitacao() {
  return useMutation({
    mutationFn: async (solicitacao_id: string) => {
      const { data, error } = await supabase.functions.invoke('corrigir-solicitacao-aprovada', {
        body: { solicitacao_id }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Solicitação corrigida com sucesso');
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('Erro ao corrigir solicitação:', error);
      toast.error(error.message || 'Erro ao corrigir solicitação');
    }
  });
}
