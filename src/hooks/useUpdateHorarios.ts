import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpdateHorariosParams {
  credenciadoCrmId: string;
  horarios: Array<{
    dia_semana: string;
    horario_inicio: string;
    horario_fim: string;
  }>;
}

export function useUpdateHorarios() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ credenciadoCrmId, horarios }: UpdateHorariosParams) => {
      // Buscar horários existentes
      const { data: existentes } = await supabase
        .from('horarios_atendimento')
        .select('id')
        .eq('credenciado_crm_id', credenciadoCrmId);

      // Deletar horários antigos
      if (existentes && existentes.length > 0) {
        const { error: deleteError } = await supabase
          .from('horarios_atendimento')
          .delete()
          .eq('credenciado_crm_id', credenciadoCrmId);

        if (deleteError) throw deleteError;
      }

      // Inserir novos horários
      const { data, error } = await supabase
        .from('horarios_atendimento')
        .insert(
          horarios.map(h => ({
            credenciado_crm_id: credenciadoCrmId,
            dia_semana: parseInt(h.dia_semana) as any,
            horario_inicio: h.horario_inicio,
            horario_fim: h.horario_fim
          }))
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credenciado'] });
      toast.success("Horários atualizados com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Erro ao atualizar horários:", error);
      toast.error("Erro ao atualizar horários: " + error.message);
    }
  });
}
