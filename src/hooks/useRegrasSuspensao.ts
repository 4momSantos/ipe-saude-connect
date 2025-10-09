import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RegraSuspensao {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_gatilho: 'ocorrencias' | 'avaliacoes' | 'vencimento_docs' | 'sancoes_acumuladas';
  condicao: any;
  acao: 'suspensao' | 'alerta' | 'descredenciamento' | 'notificacao';
  duracao_dias: number | null;
  notificar_gestores: boolean;
  notificar_credenciado: boolean;
  ativo: boolean;
  prioridade: number;
  criada_por: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export function useRegrasSuspensao() {
  const queryClient = useQueryClient();

  const { data: regras, isLoading } = useQuery({
    queryKey: ['regras-suspensao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_suspensao_automatica')
        .select('*')
        .order('prioridade', { ascending: false });

      if (error) throw error;
      return data as RegraSuspensao[];
    }
  });

  const createRegraMutation = useMutation({
    mutationFn: async (regra: Partial<RegraSuspensao>) => {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('regras_suspensao_automatica')
        .insert({
          ...regra,
          criada_por: user.user?.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-suspensao'] });
      toast.success("Regra criada");
    },
    onError: () => toast.error("Erro ao criar regra")
  });

  const toggleRegraAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('regras_suspensao_automatica')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-suspensao'] });
      toast.success("Regra atualizada");
    },
    onError: () => toast.error("Erro ao atualizar regra")
  });

  const deleteRegraMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('regras_suspensao_automatica')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-suspensao'] });
      toast.success("Regra removida");
    },
    onError: () => toast.error("Erro ao remover regra")
  });

  return {
    regras: regras || [],
    isLoading,
    createRegra: createRegraMutation.mutate,
    toggleRegraAtivo: toggleRegraAtivoMutation.mutate,
    deleteRegra: deleteRegraMutation.mutate
  };
}
