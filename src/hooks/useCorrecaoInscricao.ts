import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IniciarCorrecaoParams {
  inscricaoId: string;
}

interface EnviarCorrecaoParams {
  correcaoId: string;
  camposCorrigidos: Record<string, any>;
  documentosReenviados: string[];
  justificativa: string;
}

export function useCorrecaoInscricao() {
  const queryClient = useQueryClient();

  // Iniciar nova correção
  const iniciarCorrecao = useMutation({
    mutationFn: async ({ inscricaoId }: IniciarCorrecaoParams) => {
      const { data, error } = await supabase.rpc('iniciar_correcao_inscricao', {
        p_inscricao_id: inscricaoId
      });

      if (error) throw error;
      return data as string; // retorna correcao_id
    },
    onSuccess: () => {
      toast.success('Correção iniciada', {
        description: 'Você pode agora corrigir os campos e documentos reprovados'
      });
    },
    onError: (error: Error) => {
      console.error('Erro ao iniciar correção:', error);
      toast.error('Erro ao iniciar correção', {
        description: error.message
      });
    }
  });

  // Buscar correção em andamento
  const useCorrecaoAtual = (inscricaoId?: string) => {
    return useQuery({
      queryKey: ['correcao-atual', inscricaoId],
      queryFn: async () => {
        if (!inscricaoId) return null;

        const { data, error } = await supabase
          .from('correcoes_inscricao')
          .select('*')
          .eq('inscricao_id', inscricaoId)
          .eq('status', 'em_andamento')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        return data;
      },
      enabled: !!inscricaoId
    });
  };

  // Enviar correção completa
  const enviarCorrecao = useMutation({
    mutationFn: async ({ correcaoId, camposCorrigidos, documentosReenviados, justificativa }: EnviarCorrecaoParams) => {
      const { data, error } = await supabase.rpc('enviar_correcao_inscricao', {
        p_correcao_id: correcaoId,
        p_campos_corrigidos: camposCorrigidos,
        p_documentos_reenviados: documentosReenviados,
        p_justificativa: justificativa
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success('Correção enviada com sucesso!', {
        description: 'Sua inscrição está em análise novamente'
      });

      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['correcao-atual'] });
      queryClient.invalidateQueries({ queryKey: ['inscricao'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-messages'] });
      queryClient.invalidateQueries({ queryKey: ['historico-decisoes'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao enviar correção:', error);
      toast.error('Erro ao enviar correção', {
        description: error.message
      });
    }
  });

  // Buscar histórico de correções
  const useHistoricoCorrecoes = (inscricaoId?: string) => {
    return useQuery({
      queryKey: ['historico-correcoes', inscricaoId],
      queryFn: async () => {
        if (!inscricaoId) return [];

        const { data, error } = await supabase
          .from('correcoes_inscricao')
          .select(`
            *,
            analisado_por_profile:profiles!correcoes_inscricao_analisada_por_fkey(nome, email)
          `)
          .eq('inscricao_id', inscricaoId)
          .order('versao', { ascending: false });

        if (error) throw error;
        return data || [];
      },
      enabled: !!inscricaoId
    });
  };

  return {
    iniciarCorrecao,
    enviarCorrecao,
    useCorrecaoAtual,
    useHistoricoCorrecoes
  };
}
