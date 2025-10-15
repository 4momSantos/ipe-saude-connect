import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CategoriaEstabelecimento {
  id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}

export function useCategoriasEstabelecimentos(apenasAtivas = true) {
  const queryClient = useQueryClient();

  const { data: categorias, isLoading } = useQuery({
    queryKey: ['categorias-estabelecimentos', apenasAtivas],
    queryFn: async () => {
      let query = supabase
        .from('categorias_estabelecimentos')
        .select('*')
        .order('nome', { ascending: true });

      if (apenasAtivas) {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CategoriaEstabelecimento[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createCategoria = useMutation({
    mutationFn: async (categoria: Omit<CategoriaEstabelecimento, 'id' | 'criado_em' | 'atualizado_em'>) => {
      const { error } = await supabase
        .from('categorias_estabelecimentos')
        .insert(categoria);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-estabelecimentos'] });
      toast({ title: 'Categoria criada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' });
    },
  });

  const updateCategoria = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CategoriaEstabelecimento> & { id: string }) => {
      const { error } = await supabase
        .from('categorias_estabelecimentos')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-estabelecimentos'] });
      toast({ title: 'Categoria atualizada' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' });
    },
  });

  const deleteCategoria = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias_estabelecimentos')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-estabelecimentos'] });
      toast({ title: 'Categoria desativada' });
    },
    onError: () => {
      toast({ title: 'Erro ao desativar categoria', variant: 'destructive' });
    },
  });

  return {
    categorias,
    isLoading,
    createCategoria: createCategoria.mutate,
    updateCategoria: updateCategoria.mutate,
    deleteCategoria: deleteCategoria.mutate,
  };
}
