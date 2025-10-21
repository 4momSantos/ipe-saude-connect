import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CriterioAvaliacao {
  id: string;
  nome: string;
  descricao: string | null;
  peso: number;
  tipo_pontuacao: string;
  categoria: string | null;
  ativo: boolean;
  ordem: number | null;
}

export interface Avaliacao {
  id: string;
  credenciado_id: string;
  avaliador_id: string | null;
  periodo_referencia: string;
  pontuacao_geral: number;
  criterios: any[];
  pontos_positivos: string | null;
  pontos_melhoria: string | null;
  recomendacoes: string | null;
  status: 'rascunho' | 'finalizada' | 'revisao';
  finalizada_em: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export function useAvaliacoes(credenciadoId: string) {
  const queryClient = useQueryClient();

  const { data: criterios } = useQuery({
    queryKey: ['criterios-avaliacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('criterios_avaliacao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      return data as CriterioAvaliacao[];
    }
  });

  const { data: avaliacoes, isLoading } = useQuery({
    queryKey: ['avaliacoes', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('avaliacoes_prestadores')
        .select('*')
        .eq('credenciado_id', credenciadoId)
        .order('periodo_referencia', { ascending: false });

      if (error) throw error;
      return data as Avaliacao[];
    }
  });

  const createAvaliacaoMutation = useMutation({
    mutationFn: async (avaliacao: Partial<Avaliacao>) => {
      const { data: user, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Erro ao obter usuário:", userError);
        throw new Error("Erro ao autenticar usuário");
      }

      if (!user.user) {
        throw new Error("Usuário não autenticado");
      }

      const payload = {
        credenciado_id: credenciadoId,
        periodo_referencia: avaliacao.periodo_referencia || new Date().toISOString().split('T')[0],
        pontuacao_geral: avaliacao.pontuacao_geral || null,
        criterios: avaliacao.criterios || [],
        pontos_positivos: avaliacao.pontos_positivos || null,
        pontos_melhoria: avaliacao.pontos_melhoria || null,
        recomendacoes: avaliacao.recomendacoes || null,
        status: avaliacao.status || 'rascunho',
        finalizada_em: avaliacao.finalizada_em || null,
        avaliador_id: user.user.id
      };

      console.log("Salvando avaliação:", payload);

      const { data, error } = await supabase
        .from('avaliacoes_prestadores')
        .insert(payload)
        .select();

      if (error) {
        console.error("Erro ao inserir avaliação:", error);
        throw error;
      }

      console.log("Avaliação salva com sucesso:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes', credenciadoId] });
      queryClient.invalidateQueries({ queryKey: ['avaliacoes-stats'] });
    },
    onError: (error: Error) => {
      console.error("Erro na mutation:", error);
      toast.error(`Erro ao salvar avaliação: ${error.message}`);
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['avaliacoes-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('calcular_estatisticas_avaliacoes');
      if (error) throw error;
      return data?.[0] || null;
    }
  });

  return {
    criterios: criterios || [],
    avaliacoes: avaliacoes || [],
    stats,
    isLoading,
    createAvaliacao: createAvaliacaoMutation.mutate
  };
}
