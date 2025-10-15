import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AlterarStatusParams {
  credenciado_id: string;
  novo_status: 'Ativo' | 'Suspenso' | 'Descredenciado' | 'Afastado' | 'Inativo';
  justificativa: string;
  data_inicio?: string;
  data_fim?: string;
  data_efetiva?: string;
  motivo_detalhado?: string;
}

export function useAlterarStatusCredenciado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AlterarStatusParams) => {
      const { data, error } = await supabase.functions.invoke('alterar-status-credenciado', {
        body: params
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Status alterado com sucesso');
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['credenciado'] });
      queryClient.invalidateQueries({ queryKey: ['credenciados'] });
      queryClient.invalidateQueries({ queryKey: ['historico-status'] });
    },
    onError: (error: any) => {
      console.error('Erro ao alterar status:', error);
      toast.error(error.message || 'Erro ao alterar status do credenciado');
    }
  });
}
