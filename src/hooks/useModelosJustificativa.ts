import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useModelosJustificativa(categoria?: string) {
  const queryClient = useQueryClient();

  const { data: modelos, isLoading } = useQuery({
    queryKey: ['modelos-justificativa', categoria],
    queryFn: async () => {
      let query = supabase
        .from('modelos_justificativa')
        .select('*')
        .order('categoria', { ascending: true })
        .order('nome', { ascending: true });

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createModeloMutation = useMutation({
    mutationFn: async (modelo: {
      nome: string;
      categoria: string;
      texto_padrao: string;
      variaveis?: any;
    }) => {
      const { error } = await supabase
        .from('modelos_justificativa')
        .insert(modelo);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-justificativa'] });
      toast({
        title: 'Modelo criado',
        description: 'Modelo de justificativa criado com sucesso.',
      });
    },
  });

  const updateModeloMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('modelos_justificativa')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-justificativa'] });
      toast({
        title: 'Modelo atualizado',
        description: 'Alterações salvas com sucesso.',
      });
    },
  });

  const deleteModeloMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modelos_justificativa')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-justificativa'] });
      toast({
        title: 'Modelo removido',
        description: 'Modelo deletado com sucesso.',
      });
    },
  });

  return {
    modelos,
    isLoading,
    createModelo: createModeloMutation.mutate,
    updateModelo: updateModeloMutation.mutate,
    deleteModelo: deleteModeloMutation.mutate,
  };
}
