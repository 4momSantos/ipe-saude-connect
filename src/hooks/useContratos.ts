import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useContratos(inscricaoId: string) {
  const query = useQuery({
    queryKey: ["contratos", inscricaoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select(`
          *,
          inscricao:inscricoes_edital(
            id,
            candidato_id,
            dados_inscricao
          )
        `)
        .eq("inscricao_id", inscricaoId)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!inscricaoId
  });

  // Setup Realtime subscription para atualizações automáticas
  useEffect(() => {
    if (!inscricaoId) return;

    const channel = supabase
      .channel(`contratos-${inscricaoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contratos",
          filter: `inscricao_id=eq.${inscricaoId}`
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [inscricaoId, query]);

  return {
    contrato: query.data,
    status: query.data?.status,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  };
}

export function useTodosContratos() {
  const query = useQuery({
    queryKey: ["contratos", "todos"],
    queryFn: async () => {
      console.log('[CONTRATOS] 🔍 Iniciando fetch de TODOS os contratos...');
      
      const { data, error } = await supabase
        .from("contratos")
        .select(`
          *,
          inscricao:inscricoes_edital(
            id,
            candidato_id,
            dados_inscricao,
            candidato:profiles(
              id,
              nome,
              email
            ),
            edital:editais(
              id,
              titulo,
              numero_edital
            )
          ),
          signature_requests(
            id,
            status,
            external_id,
            metadata,
            created_at,
            updated_at,
            external_data
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('[CONTRATOS] ❌ Erro ao buscar contratos:', error);
        throw error;
      }
      
      console.log('[CONTRATOS] ✅ Total de contratos retornados:', data?.length);
      
      // Log detalhado de TODOS os contratos
      data?.forEach((contrato) => {
        console.log(`[CONTRATO] ${contrato.numero_contrato}:`, {
          id: contrato.id,
          status: contrato.status,
          inscricao_id: contrato.inscricao_id,
          signature_requests_count: contrato.signature_requests?.length || 0,
          signature_requests: contrato.signature_requests?.map((sr: any) => ({
            id: sr.id,
            status: sr.status,
            external_id: sr.external_id,
            metadata: sr.metadata,
            created_at: sr.created_at
          }))
        });
      });
      
      return data;
    },
    // 🔥 Configurações agressivas para sempre ter dados atualizados
    staleTime: 0, // Sempre considerar dados como stale
    refetchInterval: 10000, // Refetch a cada 10 segundos
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  const filtrar = (status?: string) => {
    if (!query.data) return [];
    if (!status) return query.data;
    return query.data.filter(c => c.status === status);
  };

  return {
    contratos: query.data || [],
    filtrar,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  };
}
