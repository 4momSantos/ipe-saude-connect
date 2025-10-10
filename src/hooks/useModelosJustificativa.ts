// FASE 8.3: Hook - Modelos de Justificativa
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModeloJustificativa {
  id: string;
  nome: string;
  categoria: 'indeferimento' | 'suspensao' | 'advertencia' | 'rejeicao_documento';
  texto_padrao: string;
  variaveis: string[];
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useModelosJustificativa(categoria?: string) {
  const queryClient = useQueryClient();

  const { data: modelos, isLoading } = useQuery({
    queryKey: ['modelos-justificativa', categoria],
    queryFn: async () => {
      let query = supabase
        .from('modelos_justificativa')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ModeloJustificativa[];
    }
  });

  const createModeloMutation = useMutation({
    mutationFn: async (modelo: Partial<ModeloJustificativa>) => {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('modelos_justificativa')
        .insert({
          ...modelo,
          created_by: user.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-justificativa'] });
      toast.success("Modelo criado com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar modelo: ${error.message}`);
    }
  });

  const updateModeloMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ModeloJustificativa> }) => {
      const { error } = await supabase
        .from('modelos_justificativa')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-justificativa'] });
      toast.success("Modelo atualizado com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar modelo: ${error.message}`);
    }
  });

  const deleteModeloMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modelos_justificativa')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modelos-justificativa'] });
      toast.success("Modelo desativado com sucesso");
    },
    onError: (error: any) => {
      toast.error(`Erro ao desativar modelo: ${error.message}`);
    }
  });

  return {
    modelos: modelos || [],
    isLoading,
    createModelo: createModeloMutation.mutate,
    updateModelo: updateModeloMutation.mutate,
    deleteModelo: deleteModeloMutation.mutate
  };
}

// Função helper para substituir variáveis no texto
export function substituirVariaveis(texto: string, valores: Record<string, string>): string {
  let resultado = texto;
  
  Object.entries(valores).forEach(([chave, valor]) => {
    const regex = new RegExp(`{{${chave}}}`, 'g');
    resultado = resultado.replace(regex, valor);
  });
  
  return resultado;
}
