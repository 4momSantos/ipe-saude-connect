import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useReprocessLegacyInscricoes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "reprocessar-inscricoes-legacy",
        { body: {} }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        const summary = data.summary || {};
        const results = data.results || [];
        
        // Contar sucessos e falhas
        const phaseB = results.filter((r: any) => r.phase === 'B' && r.success);
        const phaseC = results.filter((r: any) => r.phase === 'C' && r.success);
        const failures = results.filter((r: any) => !r.success);

        toast.success(
          `✅ Reprocessamento concluído`,
          {
            description: `${summary.operacoes_sucesso || 0} operações bem-sucedidas em ${summary.tempo_total_ms || 0}ms`,
            duration: 5000
          }
        );

        // Mostrar detalhes das fases
        if (phaseB.length > 0) {
          toast.info(`📄 FASE B: ${phaseB.length} contrato(s) gerado(s) e assinado(s)`);
        }
        if (phaseC.length > 0) {
          toast.info(`✍️ FASE C: ${phaseC.length} assinatura(s) simulada(s)`);
        }
        if (failures.length > 0) {
          toast.error(`⚠️ ${failures.length} operação(ões) com erro`);
        }
      } else {
        toast.error(`❌ ${data.message || 'Erro no reprocessamento'}`);
      }

      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["credenciados"] });
      queryClient.invalidateQueries({ queryKey: ["inscricoes"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reprocessar inscrições: ${error.message}`);
    },
  });
};
