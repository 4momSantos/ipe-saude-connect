import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useCorrigirInscricoesOrfas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('corrigir_inscricoes_orfas');
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const successCount = data.filter(r => r.credenciado_criado).length;
        const errorCount = data.filter(r => r.erro && r.erro.length > 0).length;
        
        if (errorCount > 0) {
          toast.warning(`Correção concluída com avisos`, {
            description: `${successCount} credenciados criados, ${errorCount} com erro`
          });
        } else {
          toast.success(`✅ Correção concluída!`, {
            description: `${successCount} credenciados criados com sucesso`
          });
        }
      } else {
        toast.info('Nenhuma inscrição órfã encontrada para corrigir');
      }
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['credenciados'] });
    },
    onError: (error: any) => {
      console.error('Erro ao corrigir inscrições órfãs:', error);
      toast.error(error.message || 'Erro ao executar correção em massa');
    }
  });
}
