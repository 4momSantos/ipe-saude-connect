import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CredenciadoCategoria {
  id: string;
  credenciado_id: string;
  categoria_id: string;
  principal: boolean;
  categoria?: {
    nome: string;
    codigo?: string;
  };
}

export function useCredenciadoCategorias(credenciadoId: string) {
  const queryClient = useQueryClient();

  const { data: categorias, isLoading } = useQuery({
    queryKey: ['credenciado-categorias', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credenciado_categorias')
        .select(`
          *,
          categoria:categorias_estabelecimentos(nome, codigo)
        `)
        .eq('credenciado_id', credenciadoId);

      if (error) throw error;
      return data as unknown as CredenciadoCategoria[];
    },
    enabled: !!credenciadoId,
  });

  const vincularCategoria = useMutation({
    mutationFn: async ({
      categoriaId,
      principal = false,
    }: {
      categoriaId: string;
      principal?: boolean;
    }) => {
      const { error } = await supabase
        .from('credenciado_categorias')
        .insert({
          credenciado_id: credenciadoId,
          categoria_id: categoriaId,
          principal,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credenciado-categorias', credenciadoId] });
      toast({ title: 'Categoria vinculada com sucesso' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao vincular categoria', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const desvincularCategoria = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await supabase
        .from('credenciado_categorias')
        .delete()
        .eq('id', vinculoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credenciado-categorias', credenciadoId] });
      toast({ title: 'Categoria removida' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover categoria', variant: 'destructive' });
    },
  });

  const definirPrincipal = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await supabase
        .from('credenciado_categorias')
        .update({ principal: true })
        .eq('id', vinculoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credenciado-categorias', credenciadoId] });
      toast({ title: 'Categoria principal atualizada' });
    },
    onError: () => {
      toast({ title: 'Erro ao definir categoria principal', variant: 'destructive' });
    },
  });

  return {
    categorias,
    isLoading,
    vincularCategoria: vincularCategoria.mutate,
    desvincularCategoria: desvincularCategoria.mutate,
    definirPrincipal: definirPrincipal.mutate,
  };
}
