import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidateCPFParams {
  cpf: string;
  birthdate: string;
}

interface CPFValidationResponse {
  valid: boolean;
  data?: {
    nome: string;
    cpf: string;
    data_nascimento: string;
    situacao_cadastral: string;
  };
  message?: string;
  code?: string;
}

export function useValidateCPF() {
  const mutation = useMutation({
    mutationFn: async ({ cpf, birthdate }: ValidateCPFParams) => {
      const { data, error } = await supabase.functions.invoke<CPFValidationResponse>(
        "validate-cpf",
        { body: { cpf, birthdate } }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.valid && data.data) {
        toast.success("CPF Válido", {
          description: `${data.data.nome} - ${data.data.situacao_cadastral}`
        });
      } else {
        toast.error("CPF Inválido", {
          description: data.message || "CPF não encontrado na Receita Federal"
        });
      }
    },
    onError: (error: Error) => {
      console.error("Erro ao validar CPF:", error);
      toast.error("Erro ao validar CPF: " + error.message);
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
