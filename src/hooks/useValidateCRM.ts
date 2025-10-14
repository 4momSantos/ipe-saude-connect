import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidateCRMParams {
  crm: string;
  uf: string;
}

interface CRMValidationResponse {
  valid: boolean;
  crm: string;
  uf: string;
  nome?: string;
  situacao?: string;
  especialidades?: string[];
  error?: string;
  cached?: boolean;
}

export function useValidateCRM() {
  const mutation = useMutation({
    mutationFn: async ({ crm, uf }: ValidateCRMParams) => {
      const { data, error } = await supabase.functions.invoke<CRMValidationResponse>("validate-crm-cfm", {
        body: { crm, uf }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        toast.success("CRM Válido", {
          description: `${data.nome || 'Médico'} - Situação: ${data.situacao || 'ATIVO'}`
        });
      } else {
        toast.error("CRM Inválido", {
          description: data.error || "CRM não encontrado ou inativo no CFM"
        });
      }
    },
    onError: (error: Error) => {
      console.error("Erro ao validar CRM:", error);
      toast.error("Erro ao validar CRM: " + error.message);
    }
  });

  return {
    validar: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    data: mutation.data
  };
}