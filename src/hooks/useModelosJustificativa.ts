import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModeloJustificativa {
  id: string;
  nome: string;
  categoria: string;
  texto_padrao: string;
  variaveis: string[];
  ativo: boolean;
}

export function useModelosJustificativa(categoria?: string) {
  const queryClient = useQueryClient();

  const { data: modelos, isLoading } = useQuery({
    queryKey: ['modelos-justificativa', categoria],
    queryFn: async () => {
      let query = supabase
        .from('modelos_justificativa' as any)
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as ModeloJustificativa[];
    }
  });

  const createModeloMutation = useMutation({
    mutationFn: async (modelo: Omit<ModeloJustificativa, 'id'>) => {
      const { error } = await supabase
        .from('modelos_justificativa' as any)
        .insert(modelo);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-justificativa'] });
      toast.success("Modelo criado");
    },
    onError: () => toast.error("Erro ao criar modelo")
  });

  const updateModeloMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ModeloJustificativa> & { id: string }) => {
      const { error } = await supabase
        .from('modelos_justificativa' as any)
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-justificativa'] });
      toast.success("Modelo atualizado");
    },
    onError: () => toast.error("Erro ao atualizar modelo")
  });

  const deleteModeloMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modelos_justificativa' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-justificativa'] });
      toast.success("Modelo removido");
    },
    onError: () => toast.error("Erro ao remover modelo")
  });

  return {
    modelos: modelos || [],
    isLoading,
    createModelo: createModeloMutation.mutate,
    updateModelo: updateModeloMutation.mutate,
    deleteModelo: deleteModeloMutation.mutate
  };
}

export function useSubstituirVariaveis() {
  return (texto: string, variaveis: Record<string, string>): string => {
    let resultado = texto;
    Object.entries(variaveis).forEach(([chave, valor]) => {
      resultado = resultado.replace(new RegExp(`{{${chave}}}`, 'g'), valor);
    });
    return resultado;
  };
}
