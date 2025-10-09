import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Sancao {
  id: string;
  credenciado_id: string;
  ocorrencia_id: string | null;
  tipo_sancao: 'advertencia' | 'suspensao' | 'multa' | 'descredenciamento';
  motivo: string;
  valor_multa: number | null;
  data_inicio: string;
  data_fim: string | null;
  duracao_dias: number | null;
  aplicada_por: string | null;
  status: 'ativa' | 'cumprida' | 'cancelada' | 'suspensa';
  observacoes: string | null;
  processo_administrativo: string | null;
  recurso_apresentado: boolean;
  recurso_deferido: boolean | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  aplicada_por_user?: { nome: string };
}

export function useSancoes(credenciadoId: string) {
  const queryClient = useQueryClient();

  const { data: sancoes, isLoading } = useQuery({
    queryKey: ['sancoes', credenciadoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sancoes_prestadores')
        .select('*')
        .eq('credenciado_id', credenciadoId)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const createSancaoMutation = useMutation({
    mutationFn: async (sancao: Partial<Sancao>) => {
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('sancoes_prestadores')
        .insert({
          credenciado_id: credenciadoId,
          tipo_sancao: sancao.tipo_sancao || 'advertencia',
          motivo: sancao.motivo || '',
          data_inicio: sancao.data_inicio || new Date().toISOString().split('T')[0],
          data_fim: sancao.data_fim || null,
          duracao_dias: sancao.duracao_dias || null,
          valor_multa: sancao.valor_multa || null,
          aplicada_por: user.user?.id || null,
          ocorrencia_id: sancao.ocorrencia_id || null,
          observacoes: sancao.observacoes || null
        });

      if (error) throw error;

      // Se suspensão, atualizar credenciado
      if (sancao.tipo_sancao === 'suspensao') {
        await supabase.from('credenciados').update({
          status: 'Suspenso',
          suspensao_inicio: sancao.data_inicio,
          suspensao_fim: sancao.data_fim,
          motivo_suspensao: sancao.motivo
        }).eq('id', credenciadoId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sancoes', credenciadoId] });
      toast.success("Sanção aplicada");
    },
    onError: () => toast.error("Erro ao aplicar sanção")
  });

  const updateSancaoStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Sancao['status'] }) => {
      const { error } = await supabase
        .from('sancoes_prestadores')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sancoes', credenciadoId] });
      toast.success("Status da sanção atualizado");
    },
    onError: () => toast.error("Erro ao atualizar sanção")
  });

  return {
    sancoes: sancoes || [],
    isLoading,
    createSancao: createSancaoMutation.mutate,
    updateSancaoStatus: updateSancaoStatusMutation.mutate
  };
}
