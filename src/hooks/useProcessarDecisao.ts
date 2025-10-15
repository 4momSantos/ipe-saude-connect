import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Decisao } from "@/types/decisao";

interface ProcessarDecisaoParams {
  inscricaoId: string;
  analiseId: string;
  decisao: Decisao;
}

export function useProcessarDecisao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inscricaoId, analiseId, decisao }: ProcessarDecisaoParams) => {
      const { data, error } = await supabase.functions.invoke('processar-decisao', {
        body: {
          inscricao_id: inscricaoId,
          analise_id: analiseId,
          decisao: {
            ...decisao,
            prazo_correcao: decisao.prazo_correcao?.toISOString()
          }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      const statusLabel = variables.decisao.status === 'aprovado' ? 'aprovada' :
                          variables.decisao.status === 'reprovado' ? 'reprovada' :
                          'correção solicitada';
      
      toast.success(`Decisão Registrada`, {
        description: `Inscrição ${statusLabel} com sucesso`
      });

      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['inscricao', variables.inscricaoId] });
      queryClient.invalidateQueries({ queryKey: ['analises'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-messages', variables.inscricaoId] });
      queryClient.invalidateQueries({ queryKey: ['historico-decisoes', variables.inscricaoId] });
    },
    onError: (error: Error) => {
      console.error('[useProcessarDecisao] Erro:', error);
      toast.error('Erro ao processar decisão', {
        description: error.message
      });
    }
  });
}
