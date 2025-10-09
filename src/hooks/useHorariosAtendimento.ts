import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Horario {
  id: string;
  credenciado_crm_id: string;
  dia_semana: string;
  horario_inicio: string;
  horario_fim: string;
  created_at: string;
}

export function useHorariosAtendimento(credenciadoCrmId: string | null) {
  const queryClient = useQueryClient();

  const { data: horarios, isLoading } = useQuery({
    queryKey: ['horarios-atendimento', credenciadoCrmId],
    queryFn: async () => {
      if (!credenciadoCrmId) return [];
      
      const { data, error } = await supabase
        .from('horarios_atendimento')
        .select('*')
        .eq('credenciado_crm_id', credenciadoCrmId)
        .order('dia_semana');

      if (error) throw error;
      return data as Horario[];
    },
    enabled: !!credenciadoCrmId
  });

  const addHorarioMutation = useMutation({
    mutationFn: async (horario: Omit<Horario, 'id' | 'created_at'>) => {
      const { error } = await supabase
        .from('horarios_atendimento')
        .insert(horario);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horarios-atendimento', credenciadoCrmId] });
      toast.success("Horário adicionado");
    },
    onError: () => toast.error("Erro ao adicionar horário")
  });

  const removeHorarioMutation = useMutation({
    mutationFn: async (horarioId: string) => {
      const { error } = await supabase
        .from('horarios_atendimento')
        .delete()
        .eq('id', horarioId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['horarios-atendimento', credenciadoCrmId] });
      toast.success("Horário removido");
    },
    onError: () => toast.error("Erro ao remover horário")
  });

  return {
    horarios: horarios || [],
    isLoading,
    addHorario: addHorarioMutation.mutate,
    removeHorario: removeHorarioMutation.mutate
  };
}
