// FASE 10.1: Hook - Categorias de Prestadores
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CategoriaPrestador {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  ativa: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface HistoricoCategorizacao {
  id: string;
  credenciado_id: string;
  categoria_anterior_id: string | null;
  categoria_nova_id: string;
  motivo: string;
  alterado_por: string | null;
  data_alteracao: string;
}

export function useCategoriasPrestadores() {
  const queryClient = useQueryClient();

  const { data: categorias, isLoading } = useQuery({
    queryKey: ['categorias-prestadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_prestadores')
        .select('*')
        .eq('ativa', true)
        .order('ordem');

      if (error) throw error;
      return data as CategoriaPrestador[];
    }
  });

  const createCategoriaMutation = useMutation({
    mutationFn: async (categoria: Partial<CategoriaPrestador>) => {
      const { error } = await supabase
        .from('categorias_prestadores')
        .insert(categoria);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-prestadores'] });
      toast.success("Categoria criada com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar categoria: ${error.message}`);
    }
  });

  const updateCategoriaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CategoriaPrestador> }) => {
      const { error } = await supabase
        .from('categorias_prestadores')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-prestadores'] });
      toast.success("Categoria atualizada com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar categoria: ${error.message}`);
    }
  });

  const deleteCategoriaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categorias_prestadores')
        .update({ ativa: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-prestadores'] });
      toast.success("Categoria desativada com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao desativar categoria: ${error.message}`);
    }
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
        .from('historico_categorizacao')
        .select(`
          *,
          categoria_anterior:categoria_anterior_id (nome, cor),
          categoria_nova:categoria_nova_id (nome, cor)
        `)
        .eq('credenciado_id', credenciadoId)
        .order('data_alteracao', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
}

export function useCategorizar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      credenciadoId, 
      categoriaId, 
      motivo 
    }: { 
      credenciadoId: string; 
      categoriaId: string; 
      motivo: string;
    }) => {
      const { error } = await supabase
        .from('credenciados')
        .update({ categoria_id: categoriaId })
        .eq('id', credenciadoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credenciados'] });
      queryClient.invalidateQueries({ queryKey: ['historico-categorizacao'] });
      toast.success("Categoria atualizada com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao categorizar: ${error.message}`);
    }
  });
}
