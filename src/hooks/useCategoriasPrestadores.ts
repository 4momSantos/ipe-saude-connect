import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useCategoriasPrestadores() {
  const queryClient = useQueryClient();

  const { data: categorias, isLoading } = useQuery({
    queryKey: ['categorias-prestadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_prestadores')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const createCategoriaMutation = useMutation({
    mutationFn: async (categoria: {
      nome: string;
      descricao?: string;
      cor?: string;
      icone?: string;
    }) => {
      const { error } = await supabase
        .from('categorias_prestadores')
        .insert(categoria);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-prestadores'] });
      toast({
        title: 'Categoria criada',
        description: 'Nova categoria adicionada com sucesso.',
      });
    },
  });

  const updateCategoriaMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('categorias_prestadores')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-prestadores'] });
      toast({
        title: 'Categoria atualizada',
        description: 'Alterações salvas com sucesso.',
      });
    },
  });

  const deleteCategoriaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias_prestadores')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-prestadores'] });
      toast({
        title: 'Categoria removida',
        description: 'Categoria deletada com sucesso.',
      });
    },
  });

  return {
    categorias,
    isLoading,
    createCategoria: createCategoriaMutation.mutate,
    updateCategoria: updateCategoriaMutation.mutate,
    deleteCategoria: deleteCategoriaMutation.mutate,
  };
}

export function useHistoricoCategorizacao(credenciadoId: string) {
  return useQuery({
    queryKey: ['historico-categorizacao', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_categorizacao')
        .select(`
          *,
          categoria_anterior:categorias_prestadores!historico_categorizacao_categoria_anterior_id_fkey(nome, cor),
          categoria_nova:categorias_prestadores!historico_categorizacao_categoria_nova_id_fkey(nome, cor)
        `)
        .eq('credenciado_id', credenciadoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
