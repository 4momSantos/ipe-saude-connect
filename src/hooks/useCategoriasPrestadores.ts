import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CategoriaPrestador {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string | null;
  ativa: boolean;
  ordem: number | null;
}

export interface HistoricoCategorizacao {
  id: string;
  credenciado_id: string;
  categoria_anterior_id: string | null;
  categoria_nova_id: string;
  motivo: string | null;
  alterado_por: string | null;
  data_alteracao: string;
}

export function useCategoriasPrestadores() {
  const queryClient = useQueryClient();

  const { data: categorias, isLoading } = useQuery({
    queryKey: ['categorias-prestadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_prestadores' as any)
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return (data || []) as CategoriaPrestador[];
    }
  });

  const createCategoriaMutation = useMutation({
    mutationFn: async (categoria: Partial<CategoriaPrestador>) => {
      const { error } = await supabase
        .from('categorias_prestadores' as any)
        .insert({
          nome: categoria.nome,
          descricao: categoria.descricao,
          cor: categoria.cor || '#3B82F6',
          icone: categoria.icone,
          ativa: categoria.ativa ?? true,
          ordem: categoria.ordem
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-prestadores'] });
      toast.success("Categoria criada");
    },
    onError: () => toast.error("Erro ao criar categoria")
  });

  const updateCategoriaMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CategoriaPrestador> & { id: string }) => {
      const { error } = await supabase
        .from('categorias_prestadores' as any)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-prestadores'] });
      toast.success("Categoria atualizada");
    },
    onError: () => toast.error("Erro ao atualizar categoria")
  });

  const deleteCategoriaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias_prestadores' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-prestadores'] });
      toast.success("Categoria removida");
    },
    onError: () => toast.error("Erro ao remover categoria")
  });

  return {
    categorias: categorias || [],
    isLoading,
    createCategoria: createCategoriaMutation.mutate,
    updateCategoria: updateCategoriaMutation.mutate,
    deleteCategoria: deleteCategoriaMutation.mutate
  };
}

export function useHistoricoCategorizacao(credenciadoId: string) {
  return useQuery({
    queryKey: ['historico-categorizacao', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('historico_categorizacao' as any)
        .select(`
          *,
          categoria_anterior:categoria_anterior_id(nome, cor),
          categoria_nova:categoria_nova_id(nome, cor)
        `)
        .eq('credenciado_id', credenciadoId)
        .order('data_alteracao', { ascending: false });

      if (error) throw error;
      return (data || []) as HistoricoCategorizacao[];
    },
    enabled: !!credenciadoId
  });
}

export function useCategorizarCredenciado() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      credenciadoId,
      categoriaNova,
      motivo
    }: {
      credenciadoId: string;
      categoriaNova: string;
      motivo: string;
    }) => {
      // Buscar categoria atual
      const { data: credenciado } = await supabase
        .from('credenciados')
        .select('categoria_id' as any)
        .eq('id', credenciadoId)
        .single();

      // Atualizar categoria do credenciado
      const { error: updateError } = await supabase
        .from('credenciados')
        .update({ categoria_id: categoriaNova } as any)
        .eq('id', credenciadoId);

      if (updateError) throw updateError;

      // Registrar no histórico
      const { data: user } = await supabase.auth.getUser();
      const { error: histError } = await supabase
        .from('historico_categorizacao' as any)
        .insert({
          credenciado_id: credenciadoId,
          categoria_anterior_id: credenciado?.categoria_id || null,
          categoria_nova_id: categoriaNova,
          motivo,
          alterado_por: user.user?.id
        });

      if (histError) throw histError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credenciados'] });
      queryClient.invalidateQueries({ queryKey: ['historico-categorizacao'] });
      toast.success("Categorização realizada");
    },
    onError: () => toast.error("Erro ao categorizar credenciado")
  });
}
