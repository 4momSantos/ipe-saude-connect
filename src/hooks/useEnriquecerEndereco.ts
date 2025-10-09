import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EnriquecerParams {
  credenciadoId?: string;
  endereco?: string;
  latitude?: number;
  longitude?: number;
}

interface EnrichmentResult {
  success: boolean;
  bairro?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  pais?: string;
  endereco_completo?: string;
  latitude?: number;
  longitude?: number;
  cached?: boolean;
  provider: string;
  error?: string;
}

export function useEnriquecerEndereco() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (params: EnriquecerParams) => {
      const { data, error } = await supabase.functions.invoke<EnrichmentResult>(
        'enriquecer-endereco-osm',
        { body: params }
      );

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao enriquecer endereço');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["credenciados"] });
      
      const cacheInfo = data.cached ? ' (cache)' : '';
      toast.success("Endereço enriquecido com sucesso!" + cacheInfo, {
        description: `${data.cidade || ''}, ${data.estado || ''}`.trim(),
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao enriquecer endereço:", error);
      toast.error("Erro ao enriquecer endereço", {
        description: error.message,
      });
    },
  });

  return {
    enriquecer: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
  };
}
