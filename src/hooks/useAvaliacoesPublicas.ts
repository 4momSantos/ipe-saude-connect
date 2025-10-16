import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AvaliacaoPublicaForm, RespostaAvaliacaoForm } from '@/schemas/avaliacaoPublicaSchema';

interface FiltrosAvaliacao {
  nota_minima?: number;
  ordenacao?: 'recentes' | 'relevantes' | 'maiores_notas' | 'menores_notas';
}

export function useAvaliacoesPublicas(
  credenciadoId: string,
  filtros?: FiltrosAvaliacao,
  pageSize: number = 10
) {
  return useInfiniteQuery({
    queryKey: ['avaliacoes-publicas', credenciadoId, filtros],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('avaliacoes_publicas')
        .select(`
          *,
          credenciados(nome)
        `, { count: 'exact' })
        .eq('credenciado_id', credenciadoId)
        .eq('status', 'aprovada');

      // Aplicar filtros
      if (filtros?.nota_minima) {
        query = query.gte('nota_estrelas', filtros.nota_minima);
      }

      // Ordenação
      switch (filtros?.ordenacao) {
        case 'recentes':
          query = query.order('created_at', { ascending: false });
          break;
        case 'maiores_notas':
          query = query.order('nota_estrelas', { ascending: false });
          break;
        case 'menores_notas':
          query = query.order('nota_estrelas', { ascending: true });
          break;
        case 'relevantes':
        default:
          // Relevantes = mais recentes com maior peso para verificados
          query = query.order('avaliador_verificado', { ascending: false })
                      .order('created_at', { ascending: false });
          break;
      }

      // Paginação
      const from = pageParam * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        avaliacoes: data || [],
        nextPage: data && data.length === pageSize ? pageParam + 1 : undefined,
        count: count || 0,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!credenciadoId,
  });
}

export function useCriarAvaliacaoPublica() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AvaliacaoPublicaForm) => {
      const { data: result, error } = await supabase.functions.invoke(
        'criar-avaliacao-publica',
        {
          body: data,
        }
      );

      if (error) throw error;
      return result;
    },
    onSuccess: (result, variables) => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ 
        queryKey: ['avaliacoes-publicas', variables.credenciado_id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['estatisticas-credenciado', variables.credenciado_id] 
      });

      toast.success(result.mensagem || 'Avaliação enviada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao criar avaliação:', error);
      toast.error(error.message || 'Erro ao enviar avaliação');
    },
  });
}

export function useResponderAvaliacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RespostaAvaliacaoForm) => {
      const { data: result, error } = await supabase.functions.invoke(
        'responder-avaliacao',
        {
          body: data,
        }
      );

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      // Invalidar todas as queries de avaliações públicas
      queryClient.invalidateQueries({ queryKey: ['avaliacoes-publicas'] });

      toast.success(result.mensagem || 'Resposta publicada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao responder avaliação:', error);
      toast.error(error.message || 'Erro ao publicar resposta');
    },
  });
}

export function useAvaliacoesPendentes(credenciadoId?: string) {
  return useQuery({
    queryKey: ['avaliacoes-pendentes', credenciadoId],
    queryFn: async () => {
      let query = supabase
        .from('avaliacoes_publicas')
        .select(`
          *,
          credenciados(id, nome)
        `)
        .eq('status', 'aprovada')
        .is('resposta_profissional', null)
        .order('created_at', { ascending: false });

      if (credenciadoId) {
        query = query.eq('credenciado_id', credenciadoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!credenciadoId,
  });
}
