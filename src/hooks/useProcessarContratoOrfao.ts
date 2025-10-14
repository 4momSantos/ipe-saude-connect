import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProcessarContratoParams {
  contratoId: string;
}

interface ProcessarContratoResponse {
  success: boolean;
  already_exists?: boolean;
  credenciado_id: string;
  credenciado_nome: string;
  contrato_numero: string;
  inscricao_protocolo: string;
  error?: string;
}

export const useProcessarContratoOrfao = () => {
  const queryClient = useQueryClient();

  const processar = useMutation({
    mutationFn: async ({ contratoId }: ProcessarContratoParams) => {
      const { data, error } = await supabase.functions.invoke<ProcessarContratoResponse>(
        "processar-contrato-orfao",
        {
          body: { contrato_id: contratoId }
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        if (data.already_exists) {
          toast.info(
            `Credenciado já existe`,
            {
              description: `${data.credenciado_nome} - ${data.contrato_numero}`
            }
          );
        } else {
          toast.success(
            `✅ Credenciado criado com sucesso`,
            {
              description: `${data.credenciado_nome} - ${data.contrato_numero}`
            }
          );
        }
      } else {
        toast.error(`❌ ${data?.error || 'Erro desconhecido'}`);
      }

      // Invalidar queries para recarregar dados
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["credenciados"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao processar contrato: ${error.message}`);
    },
  });

  const processarTodos = useMutation({
    mutationFn: async (contratoIds: string[]) => {
      const results = [];
      
      for (const contratoId of contratoIds) {
        try {
          const { data, error } = await supabase.functions.invoke<ProcessarContratoResponse>(
            "processar-contrato-orfao",
            {
              body: { contrato_id: contratoId }
            }
          );

          if (error) throw error;
          results.push({ contratoId, success: true, data });
        } catch (error) {
          results.push({ contratoId, success: false, error: error.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const sucessos = results.filter(r => r.success).length;
      const erros = results.filter(r => !r.success).length;

      if (erros === 0) {
        toast.success(
          `✅ ${sucessos} ${sucessos === 1 ? 'contrato processado' : 'contratos processados'}`
        );
      } else if (sucessos === 0) {
        toast.error(`❌ Erro ao processar contratos: ${erros} erros`);
      } else {
        toast.warning(
          `⚠️ ${sucessos} processados, ${erros} ${erros === 1 ? 'erro' : 'erros'}`
        );
      }

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ["contratos"] });
      queryClient.invalidateQueries({ queryKey: ["credenciados"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao processar contratos: ${error.message}`);
    },
  });

  return {
    processar: processar.mutateAsync,
    processarTodos: processarTodos.mutateAsync,
    isProcessando: processar.isPending,
    isProcessandoTodos: processarTodos.isPending,
  };
};
