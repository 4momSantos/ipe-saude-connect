import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCorrigirCrmsFaltantes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('corrigir-crms-faltantes');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        toast.success(`✅ Correção concluída!`, {
          description: `${data.crms_criados} credenciados com CRMs criados`
        });
      } else {
        toast.error('Erro ao processar correção');
      }
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['credenciados'] });
      queryClient.invalidateQueries({ queryKey: ['credenciado'] });
    },
    onError: (error: any) => {
      console.error('Erro ao corrigir CRMs:', error);
      toast.error(error.message || 'Erro ao executar correção de CRMs');
    }
  });
}
