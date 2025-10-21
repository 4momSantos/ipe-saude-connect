import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useInscricaoDados(inscricaoId: string | undefined) {
  return useQuery({
    queryKey: ["inscricao-dados", inscricaoId],
    queryFn: async () => {
      if (!inscricaoId) {
        throw new Error("ID da inscrição não fornecido");
      }

      console.log('[useInscricaoDados] Buscando dados da inscrição:', inscricaoId);

      const { data, error } = await supabase
        .from("inscricoes_edital")
        .select(`
          id,
          candidato_id,
          edital_id,
          status,
          dados_inscricao,
          tipo_credenciamento,
          protocolo,
          created_at,
          updated_at
        `)
        .eq("id", inscricaoId)
        .single();

      if (error) {
        console.error('[useInscricaoDados] Erro ao buscar dados:', error);
        throw error;
      }

      console.log('[useInscricaoDados] Dados carregados:', data);
      return data;
    },
    enabled: !!inscricaoId,
    staleTime: 30000, // Cache por 30 segundos
  });
}
