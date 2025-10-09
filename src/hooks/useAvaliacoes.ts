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
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('avaliacoes_prestadores')
        .insert({
          ...avaliacao,
          credenciado_id: credenciadoId,
          avaliador_id: user.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['avaliacoes', credenciadoId] });
      toast.success("Avaliação salva");
    },
    onError: () => toast.error("Erro ao salvar avaliação")
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
